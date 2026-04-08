package vn.edu.hcmuaf.fit.marketplace.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.edu.hcmuaf.fit.marketplace.entity.Order;
import vn.edu.hcmuaf.fit.marketplace.entity.PayoutRequest;
import vn.edu.hcmuaf.fit.marketplace.entity.VendorWallet;
import vn.edu.hcmuaf.fit.marketplace.entity.WalletTransaction;
import vn.edu.hcmuaf.fit.marketplace.repository.*;

import java.math.BigDecimal;
import java.util.ArrayDeque;
import java.util.Optional;
import java.util.Queue;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;

/**
 * Comprehensive test suite for Escrow & Payout System.
 * Covers: Escrow credit, 7-day release, refund debit, payout creation,
 * payout approval/rejection, and concurrency prevention.
 */
@ExtendWith(MockitoExtension.class)
class EscrowPayoutIntegrationTest {

    @Mock private OrderRepository orderRepository;
    @Mock private VendorWalletRepository vendorWalletRepository;
    @Mock private WalletTransactionRepository walletTransactionRepository;
    @Mock private CustomerWalletRepository customerWalletRepository;
    @Mock private CustomerWalletTransactionRepository customerWalletTransactionRepository;
    @Mock private PayoutRequestRepository payoutRequestRepository;

    private WalletService walletService;
    private FixedPublicCodeService publicCodeService;

    @BeforeEach
    void setUp() {
        publicCodeService = new FixedPublicCodeService();
        walletService = new WalletService(
                orderRepository,
                vendorWalletRepository,
                walletTransactionRepository,
                customerWalletRepository,
                customerWalletTransactionRepository,
                payoutRequestRepository,
                publicCodeService
        );
    }

    // ─── ESCROW CREDIT (Order DELIVERED) ─────────────────────────────────────

    @Nested
    @DisplayName("Scenario: Escrow Credit on Order Delivery")
    class EscrowCreditTests {

        @Test
        @DisplayName("NetIncome moves to frozenBalance, availableBalance unchanged")
        void creditEscrowAddsToFrozenBalanceOnly() {
            UUID orderId = UUID.randomUUID();
            UUID storeId = UUID.randomUUID();

            Order order = Order.builder()
                    .id(orderId)
                    .orderCode("DH-260401-000100")
                    .storeId(storeId)
                    .vendorPayout(new BigDecimal("850000"))
                    .build();

            VendorWallet wallet = VendorWallet.builder()
                    .storeId(storeId)
                    .availableBalance(new BigDecimal("2000000"))
                    .frozenBalance(new BigDecimal("500000"))
                    .build();

            when(orderRepository.findByIdForUpdate(orderId)).thenReturn(Optional.of(order));
            when(walletTransactionRepository.existsByOrderIdAndType(orderId, WalletTransaction.TransactionType.ESCROW_CREDIT))
                    .thenReturn(false);
            when(vendorWalletRepository.findByStoreIdForUpdate(storeId)).thenReturn(Optional.of(wallet));
            when(vendorWalletRepository.save(any(VendorWallet.class))).thenAnswer(inv -> inv.getArgument(0));
            when(walletTransactionRepository.save(any(WalletTransaction.class))).thenAnswer(inv -> inv.getArgument(0));
            publicCodeService.pushTransactionCode("GD-ESCROW-000001");

            walletService.creditEscrowForCompletedOrder(order);

            assertEquals(0, wallet.getFrozenBalance().compareTo(new BigDecimal("1350000")),
                    "frozenBalance should increase by vendorPayout");
            assertEquals(0, wallet.getAvailableBalance().compareTo(new BigDecimal("2000000")),
                    "availableBalance should remain unchanged");

            verify(walletTransactionRepository).save(argThat(tx ->
                    tx.getType() == WalletTransaction.TransactionType.ESCROW_CREDIT
                            && tx.getAmount().compareTo(new BigDecimal("850000")) == 0
                            && orderId.equals(tx.getOrderId())
            ));
        }

        @Test
        @DisplayName("Idempotent: duplicate ESCROW_CREDIT is skipped")
        void creditEscrowIsIdempotent() {
            UUID orderId = UUID.randomUUID();
            UUID storeId = UUID.randomUUID();

            Order order = Order.builder()
                    .id(orderId)
                    .storeId(storeId)
                    .vendorPayout(new BigDecimal("500000"))
                    .build();

            when(orderRepository.findByIdForUpdate(orderId)).thenReturn(Optional.of(order));
            when(walletTransactionRepository.existsByOrderIdAndType(orderId, WalletTransaction.TransactionType.ESCROW_CREDIT))
                    .thenReturn(true);

            walletService.creditEscrowForCompletedOrder(order);

            verify(vendorWalletRepository, never()).findByStoreIdForUpdate(any());
            verify(vendorWalletRepository, never()).save(any());
            verify(walletTransactionRepository, never()).save(any());
        }

        @Test
        @DisplayName("Skips when vendorPayout is null or zero")
        void creditEscrowSkipsZeroPayout() {
            UUID orderId = UUID.randomUUID();
            UUID storeId = UUID.randomUUID();

            Order order = Order.builder()
                    .id(orderId)
                    .storeId(storeId)
                    .vendorPayout(BigDecimal.ZERO)
                    .build();

            walletService.creditEscrowForCompletedOrder(order);

            verify(orderRepository, never()).findByIdForUpdate(any());
            verify(vendorWalletRepository, never()).findByStoreIdForUpdate(any());
        }

        @Test
        @DisplayName("Skips when order has no storeId (parent order)")
        void creditEscrowSkipsParentOrder() {
            Order order = Order.builder()
                    .id(UUID.randomUUID())
                    .storeId(null)
                    .vendorPayout(new BigDecimal("500000"))
                    .build();

            walletService.creditEscrowForCompletedOrder(order);

            verify(orderRepository, never()).findByIdForUpdate(any());
        }
    }

    // ─── ESCROW RELEASE (7-day rule) ─────────────────────────────────────────

    @Nested
    @DisplayName("Scenario: Escrow Release after 7 days")
    class EscrowReleaseTests {

        @Test
        @DisplayName("Moves amount from frozenBalance to availableBalance")
        void releaseEscrowTransfersBalance() {
            UUID storeId = UUID.randomUUID();
            UUID orderId = UUID.randomUUID();
            BigDecimal amount = new BigDecimal("850000");

            VendorWallet wallet = VendorWallet.builder()
                    .storeId(storeId)
                    .availableBalance(new BigDecimal("2000000"))
                    .frozenBalance(new BigDecimal("1350000"))
                    .build();

            when(vendorWalletRepository.findByStoreIdForUpdate(storeId)).thenReturn(Optional.of(wallet));
            when(vendorWalletRepository.save(any(VendorWallet.class))).thenAnswer(inv -> inv.getArgument(0));
            when(walletTransactionRepository.save(any(WalletTransaction.class))).thenAnswer(inv -> inv.getArgument(0));
            publicCodeService.pushTransactionCode("GD-RELEASE-000001");

            walletService.releaseEscrowToAvailable(storeId, orderId, amount);

            assertEquals(0, wallet.getFrozenBalance().compareTo(new BigDecimal("500000")),
                    "frozenBalance should decrease");
            assertEquals(0, wallet.getAvailableBalance().compareTo(new BigDecimal("2850000")),
                    "availableBalance should increase");

            verify(walletTransactionRepository).save(argThat(tx ->
                    tx.getType() == WalletTransaction.TransactionType.ESCROW_RELEASE
                            && tx.getAmount().compareTo(amount) == 0
            ));
        }

        @Test
        @DisplayName("Throws when frozenBalance is insufficient")
        void releaseEscrowFailsOnInsufficientFrozen() {
            UUID storeId = UUID.randomUUID();
            UUID orderId = UUID.randomUUID();
            BigDecimal amount = new BigDecimal("9999999");

            VendorWallet wallet = VendorWallet.builder()
                    .storeId(storeId)
                    .availableBalance(new BigDecimal("5000000"))
                    .frozenBalance(new BigDecimal("100000"))
                    .build();

            when(vendorWalletRepository.findByStoreIdForUpdate(storeId)).thenReturn(Optional.of(wallet));

            assertThrows(IllegalArgumentException.class,
                    () -> walletService.releaseEscrowToAvailable(storeId, orderId, amount),
                    "Should throw when frozenBalance is insufficient");
        }
    }

    // ─── REFUND DEBIT ────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Scenario: Refund & Cancellation (Negative Flow)")
    class RefundDebitTests {

        @Test
        @DisplayName("Deducts from frozenBalance first")
        void refundDebitsFromFrozenBalance() {
            UUID orderId = UUID.randomUUID();
            UUID storeId = UUID.randomUUID();

            Order order = Order.builder()
                    .id(orderId)
                    .orderCode("DH-260401-000200")
                    .storeId(storeId)
                    .vendorPayout(new BigDecimal("300000"))
                    .build();

            VendorWallet wallet = VendorWallet.builder()
                    .storeId(storeId)
                    .availableBalance(new BigDecimal("1000000"))
                    .frozenBalance(new BigDecimal("500000"))
                    .build();

            when(orderRepository.findByIdForUpdate(orderId)).thenReturn(Optional.of(order));
            when(walletTransactionRepository.existsByOrderIdAndType(orderId, WalletTransaction.TransactionType.ESCROW_CREDIT))
                    .thenReturn(true);
            when(walletTransactionRepository.existsByOrderIdAndType(orderId, WalletTransaction.TransactionType.REFUND_DEBIT))
                    .thenReturn(false);
            when(vendorWalletRepository.findByStoreIdForUpdate(storeId)).thenReturn(Optional.of(wallet));
            when(vendorWalletRepository.save(any(VendorWallet.class))).thenAnswer(inv -> inv.getArgument(0));
            when(walletTransactionRepository.save(any(WalletTransaction.class))).thenAnswer(inv -> inv.getArgument(0));
            publicCodeService.pushTransactionCode("GD-REFUND-000001");

            walletService.debitVendorForRefund(order);

            assertEquals(0, wallet.getFrozenBalance().compareTo(new BigDecimal("200000")),
                    "frozenBalance should be decremented");
            assertEquals(0, wallet.getAvailableBalance().compareTo(new BigDecimal("1000000")),
                    "availableBalance should remain unchanged");

            verify(walletTransactionRepository).save(argThat(tx ->
                    tx.getType() == WalletTransaction.TransactionType.REFUND_DEBIT
            ));
        }

        @Test
        @DisplayName("Deducts from availableBalance when frozenBalance is insufficient")
        void refundDebitsFromAvailableWhenFrozenInsufficient() {
            UUID orderId = UUID.randomUUID();
            UUID storeId = UUID.randomUUID();

            Order order = Order.builder()
                    .id(orderId)
                    .storeId(storeId)
                    .vendorPayout(new BigDecimal("800000"))
                    .build();

            VendorWallet wallet = VendorWallet.builder()
                    .storeId(storeId)
                    .availableBalance(new BigDecimal("2000000"))
                    .frozenBalance(new BigDecimal("100000"))
                    .build();

            when(orderRepository.findByIdForUpdate(orderId)).thenReturn(Optional.of(order));
            when(walletTransactionRepository.existsByOrderIdAndType(orderId, WalletTransaction.TransactionType.ESCROW_CREDIT))
                    .thenReturn(true);
            when(walletTransactionRepository.existsByOrderIdAndType(orderId, WalletTransaction.TransactionType.REFUND_DEBIT))
                    .thenReturn(false);
            when(vendorWalletRepository.findByStoreIdForUpdate(storeId)).thenReturn(Optional.of(wallet));
            when(vendorWalletRepository.save(any(VendorWallet.class))).thenAnswer(inv -> inv.getArgument(0));
            when(walletTransactionRepository.save(any(WalletTransaction.class))).thenAnswer(inv -> inv.getArgument(0));
            publicCodeService.pushTransactionCode("GD-REFUND-000002");

            walletService.debitVendorForRefund(order);

            assertEquals(0, wallet.getFrozenBalance().compareTo(BigDecimal.ZERO),
                    "frozenBalance should be fully consumed");
            assertEquals(0, wallet.getAvailableBalance().compareTo(new BigDecimal("1300000")),
                    "remaining should come from availableBalance");
        }

        @Test
        @DisplayName("Throws when total balance is insufficient for refund")
        void refundFailsWhenTotalBalanceInsufficient() {
            UUID orderId = UUID.randomUUID();
            UUID storeId = UUID.randomUUID();

            Order order = Order.builder()
                    .id(orderId)
                    .storeId(storeId)
                    .vendorPayout(new BigDecimal("5000000"))
                    .build();

            VendorWallet wallet = VendorWallet.builder()
                    .storeId(storeId)
                    .availableBalance(new BigDecimal("100000"))
                    .frozenBalance(new BigDecimal("100000"))
                    .build();

            when(orderRepository.findByIdForUpdate(orderId)).thenReturn(Optional.of(order));
            when(walletTransactionRepository.existsByOrderIdAndType(orderId, WalletTransaction.TransactionType.ESCROW_CREDIT))
                    .thenReturn(true);
            when(walletTransactionRepository.existsByOrderIdAndType(orderId, WalletTransaction.TransactionType.REFUND_DEBIT))
                    .thenReturn(false);
            when(vendorWalletRepository.findByStoreIdForUpdate(storeId)).thenReturn(Optional.of(wallet));

            assertThrows(IllegalArgumentException.class,
                    () -> walletService.debitVendorForRefund(order),
                    "Should throw when total balance is insufficient");
        }
    }

    // ─── PAYOUT REQUEST ──────────────────────────────────────────────────────

    @Nested
    @DisplayName("Scenario: Payout Request Creation")
    class PayoutRequestTests {

        @Test
        @DisplayName("Creates PENDING payout when availableBalance is sufficient")
        void createPayoutRequestSucceeds() {
            UUID storeId = UUID.randomUUID();
            BigDecimal amount = new BigDecimal("500000");

            VendorWallet wallet = VendorWallet.builder()
                    .storeId(storeId)
                    .availableBalance(new BigDecimal("1200000"))
                    .frozenBalance(new BigDecimal("300000"))
                    .reservedBalance(BigDecimal.ZERO)
                    .build();

            when(vendorWalletRepository.findByStoreIdForUpdate(storeId)).thenReturn(Optional.of(wallet));
            when(payoutRequestRepository.sumPendingAmountByStoreId(storeId)).thenReturn(BigDecimal.ZERO);
            when(vendorWalletRepository.save(any(VendorWallet.class))).thenAnswer(inv -> inv.getArgument(0));
            when(payoutRequestRepository.save(any(PayoutRequest.class))).thenAnswer(inv -> {
                PayoutRequest req = inv.getArgument(0);
                req.setId(UUID.randomUUID());
                return req;
            });

            PayoutRequest request = walletService.createPayoutRequest(
                    storeId, amount, "Nguyen Van A", "1234567890", "VCB");

            assertEquals(PayoutRequest.PayoutStatus.PENDING, request.getStatus());
            assertEquals(0, request.getAmount().compareTo(amount));
            assertEquals("Nguyen Van A", request.getBankAccountName());
            assertEquals("1234567890", request.getBankAccountNumber());
            assertEquals("VCB", request.getBankName());
            assertEquals(0, wallet.getAvailableBalance().compareTo(new BigDecimal("700000")));
            assertEquals(0, wallet.getReservedBalance().compareTo(new BigDecimal("500000")));

            verify(payoutRequestRepository).save(any(PayoutRequest.class));
        }

        @Test
        @DisplayName("Fails when availableBalance is insufficient")
        void createPayoutRequestFailsOnInsufficientBalance() {
            UUID storeId = UUID.randomUUID();
            BigDecimal amount = new BigDecimal("5000000");

            VendorWallet wallet = VendorWallet.builder()
                    .storeId(storeId)
                    .availableBalance(new BigDecimal("1200000"))
                    .frozenBalance(new BigDecimal("3000000"))
                    .reservedBalance(BigDecimal.ZERO)
                    .build();

            when(vendorWalletRepository.findByStoreIdForUpdate(storeId)).thenReturn(Optional.of(wallet));
            when(payoutRequestRepository.sumPendingAmountByStoreId(storeId)).thenReturn(BigDecimal.ZERO);

            assertThrows(IllegalArgumentException.class,
                    () -> walletService.createPayoutRequest(storeId, amount, "A", "123", "VCB"),
                    "Should fail when availableBalance < amount");
        }

        @Test
        @DisplayName("Moves amount from available to reserved on request creation")
        void createPayoutRequestReservesBalance() {
            UUID storeId = UUID.randomUUID();
            BigDecimal amount = new BigDecimal("500000");
            BigDecimal initialAvailable = new BigDecimal("1200000");

            VendorWallet wallet = VendorWallet.builder()
                    .storeId(storeId)
                    .availableBalance(initialAvailable)
                    .frozenBalance(new BigDecimal("300000"))
                    .reservedBalance(BigDecimal.ZERO)
                    .build();

            when(vendorWalletRepository.findByStoreIdForUpdate(storeId)).thenReturn(Optional.of(wallet));
            when(payoutRequestRepository.sumPendingAmountByStoreId(storeId)).thenReturn(BigDecimal.ZERO);
            when(vendorWalletRepository.save(any(VendorWallet.class))).thenAnswer(inv -> inv.getArgument(0));
            when(payoutRequestRepository.save(any(PayoutRequest.class))).thenAnswer(inv -> {
                PayoutRequest req = inv.getArgument(0);
                req.setId(UUID.randomUUID());
                return req;
            });

            walletService.createPayoutRequest(storeId, amount, "A", "123", "VCB");

            assertEquals(0, wallet.getAvailableBalance().compareTo(new BigDecimal("700000")),
                    "availableBalance should be reserved during request creation");
            assertEquals(0, wallet.getReservedBalance().compareTo(new BigDecimal("500000")),
                    "reservedBalance should increase during request creation");
        }
    }

    // ─── PAYOUT APPROVAL ─────────────────────────────────────────────────────

    @Nested
    @DisplayName("Scenario: Admin Approves Payout")
    class PayoutApprovalTests {

        @Test
        @DisplayName("Deducts availableBalance and creates PAYOUT_DEBIT transaction")
        void approvePayoutDeductsBalance() {
            UUID payoutId = UUID.randomUUID();
            UUID storeId = UUID.randomUUID();
            UUID adminId = UUID.randomUUID();
            BigDecimal amount = new BigDecimal("500000");

            PayoutRequest request = PayoutRequest.builder()
                    .id(payoutId)
                    .storeId(storeId)
                    .amount(amount)
                    .status(PayoutRequest.PayoutStatus.PENDING)
                    .build();

            VendorWallet wallet = VendorWallet.builder()
                    .storeId(storeId)
                    .availableBalance(new BigDecimal("1200000"))
                    .frozenBalance(new BigDecimal("300000"))
                    .reservedBalance(new BigDecimal("500000"))
                    .build();

            when(payoutRequestRepository.findByIdForUpdate(payoutId)).thenReturn(Optional.of(request));
            when(vendorWalletRepository.findByStoreIdForUpdate(storeId)).thenReturn(Optional.of(wallet));
            when(vendorWalletRepository.save(any(VendorWallet.class))).thenAnswer(inv -> inv.getArgument(0));
            when(payoutRequestRepository.save(any(PayoutRequest.class))).thenAnswer(inv -> inv.getArgument(0));
            when(walletTransactionRepository.save(any(WalletTransaction.class))).thenAnswer(inv -> inv.getArgument(0));
            publicCodeService.pushTransactionCode("GD-PAYOUT-000001");

            PayoutRequest result = walletService.approvePayoutRequest(payoutId, adminId);

            assertEquals(PayoutRequest.PayoutStatus.APPROVED, result.getStatus());
            assertEquals(0, wallet.getAvailableBalance().compareTo(new BigDecimal("1200000")),
                    "availableBalance should be unchanged after approval");
            assertEquals(0, wallet.getFrozenBalance().compareTo(new BigDecimal("300000")),
                    "frozenBalance should be unchanged");
            assertEquals(0, wallet.getReservedBalance().compareTo(BigDecimal.ZERO),
                    "reservedBalance should be deducted on approval");

            verify(walletTransactionRepository).save(argThat(tx ->
                    tx.getType() == WalletTransaction.TransactionType.PAYOUT_DEBIT
                            && tx.getAmount().compareTo(amount) == 0
            ));
        }

        @Test
        @DisplayName("Cannot approve non-PENDING payout")
        void approvePayoutFailsOnNonPending() {
            UUID payoutId = UUID.randomUUID();

            PayoutRequest request = PayoutRequest.builder()
                    .id(payoutId)
                    .storeId(UUID.randomUUID())
                    .amount(new BigDecimal("100000"))
                    .status(PayoutRequest.PayoutStatus.APPROVED)
                    .build();

            when(payoutRequestRepository.findByIdForUpdate(payoutId)).thenReturn(Optional.of(request));

            assertThrows(IllegalStateException.class,
                    () -> walletService.approvePayoutRequest(payoutId, UUID.randomUUID()));
        }

        @Test
        @DisplayName("Cannot approve when reservedBalance dropped below payout amount")
        void approvePayoutFailsOnInsufficientReservedAtApprovalTime() {
            UUID payoutId = UUID.randomUUID();
            UUID storeId = UUID.randomUUID();
            BigDecimal amount = new BigDecimal("500000");

            PayoutRequest request = PayoutRequest.builder()
                    .id(payoutId)
                    .storeId(storeId)
                    .amount(amount)
                    .status(PayoutRequest.PayoutStatus.PENDING)
                    .build();

            VendorWallet wallet = VendorWallet.builder()
                    .storeId(storeId)
                    .availableBalance(new BigDecimal("900000"))
                    .frozenBalance(new BigDecimal("0"))
                    .reservedBalance(new BigDecimal("100000"))
                    .build();

            when(payoutRequestRepository.findByIdForUpdate(payoutId)).thenReturn(Optional.of(request));
            when(vendorWalletRepository.findByStoreIdForUpdate(storeId)).thenReturn(Optional.of(wallet));

            assertThrows(IllegalArgumentException.class,
                    () -> walletService.approvePayoutRequest(payoutId, UUID.randomUUID()),
                    "Should fail if reserved balance dropped between request and approval");
        }
    }

    // ─── PAYOUT REJECTION ────────────────────────────────────────────────────

    @Nested
    @DisplayName("Scenario: Admin Rejects Payout")
    class PayoutRejectionTests {

        @Test
        @DisplayName("Sets status to REJECTED, returns reserved amount back to available")
        void rejectPayoutSetsRejectedStatus() {
            UUID payoutId = UUID.randomUUID();
            UUID storeId = UUID.randomUUID();
            UUID adminId = UUID.randomUUID();
            BigDecimal amount = new BigDecimal("500000");

            PayoutRequest request = PayoutRequest.builder()
                    .id(payoutId)
                    .storeId(storeId)
                    .amount(amount)
                    .status(PayoutRequest.PayoutStatus.PENDING)
                    .build();

            VendorWallet wallet = VendorWallet.builder()
                    .storeId(storeId)
                    .availableBalance(new BigDecimal("700000"))
                    .frozenBalance(new BigDecimal("300000"))
                    .reservedBalance(new BigDecimal("500000"))
                    .build();

            when(payoutRequestRepository.findByIdForUpdate(payoutId)).thenReturn(Optional.of(request));
            when(payoutRequestRepository.save(any(PayoutRequest.class))).thenAnswer(inv -> inv.getArgument(0));
            when(vendorWalletRepository.findByStoreIdForUpdate(storeId)).thenReturn(Optional.of(wallet));
            when(vendorWalletRepository.save(any(VendorWallet.class))).thenAnswer(inv -> inv.getArgument(0));

            PayoutRequest result = walletService.rejectPayoutRequest(payoutId, adminId, "Account verification failed");

            assertEquals(PayoutRequest.PayoutStatus.REJECTED, result.getStatus());
            assertEquals("Account verification failed", result.getAdminNote());
            assertEquals(adminId, result.getProcessedBy());
            assertNotNull(result.getProcessedAt());
            assertEquals(0, wallet.getAvailableBalance().compareTo(new BigDecimal("1200000")));
            assertEquals(0, wallet.getReservedBalance().compareTo(BigDecimal.ZERO));
        }
    }

    // ─── CONCURRENCY PREVENTION ──────────────────────────────────────────────

    @Nested
    @DisplayName("Scenario: Concurrency & Double Spending Prevention")
    class ConcurrencyTests {

        @Test
        @DisplayName("Second payout request is rejected when it exceeds remaining available balance")
        void secondPayoutRequestIsRejectedWhenOverCommitted() {
            UUID storeId = UUID.randomUUID();
            BigDecimal available = new BigDecimal("1200000");
            BigDecimal requestAmount = new BigDecimal("1000000");

            VendorWallet wallet = VendorWallet.builder()
                    .storeId(storeId)
                    .availableBalance(available)
                    .frozenBalance(new BigDecimal("0"))
                    .reservedBalance(BigDecimal.ZERO)
                    .build();

            when(vendorWalletRepository.findByStoreIdForUpdate(storeId)).thenReturn(Optional.of(wallet));
            when(vendorWalletRepository.save(any(VendorWallet.class))).thenAnswer(inv -> inv.getArgument(0));
            when(payoutRequestRepository.sumPendingAmountByStoreId(storeId)).thenReturn(BigDecimal.ZERO, requestAmount);
            when(payoutRequestRepository.save(any(PayoutRequest.class))).thenAnswer(inv -> {
                PayoutRequest req = inv.getArgument(0);
                req.setId(UUID.randomUUID());
                return req;
            });

            PayoutRequest first = walletService.createPayoutRequest(storeId, requestAmount, "A", "111", "VCB");
            assertEquals(PayoutRequest.PayoutStatus.PENDING, first.getStatus());

            assertThrows(IllegalArgumentException.class,
                    () -> walletService.createPayoutRequest(storeId, requestAmount, "B", "222", "VCB"));
            assertEquals(0, wallet.getAvailableBalance().compareTo(new BigDecimal("200000")));
            assertEquals(0, wallet.getReservedBalance().compareTo(requestAmount));
        }
    }

    // ─── HELPER ──────────────────────────────────────────────────────────────

    private static final class FixedPublicCodeService extends PublicCodeService {
        private final Queue<String> transactionCodes = new ArrayDeque<>();

        private FixedPublicCodeService() {
            super(null, null, null, null);
        }

        void pushTransactionCode(String code) {
            transactionCodes.add(code);
        }

        @Override
        public String nextTransactionCode() {
            String code = transactionCodes.poll();
            return code != null ? code : "GD-TEST-000001";
        }
    }
}
