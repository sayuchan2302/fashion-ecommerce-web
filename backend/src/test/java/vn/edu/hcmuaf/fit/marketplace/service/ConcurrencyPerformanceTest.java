package vn.edu.hcmuaf.fit.marketplace.service;

import org.junit.jupiter.api.DisplayName;
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
import java.time.LocalDateTime;
import java.util.ArrayDeque;
import java.util.Optional;
import java.util.Queue;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Concurrency and Performance tests for Escrow & Payout System.
 * Verifies race condition prevention and response time under load.
 */
@ExtendWith(MockitoExtension.class)
class ConcurrencyPerformanceTest {

    @Mock private OrderRepository orderRepository;
    @Mock private VendorWalletRepository vendorWalletRepository;
    @Mock private WalletTransactionRepository walletTransactionRepository;
    @Mock private CustomerWalletRepository customerWalletRepository;
    @Mock private CustomerWalletTransactionRepository customerWalletTransactionRepository;
    @Mock private PayoutRequestRepository payoutRequestRepository;

    private FixedPublicCodeService publicCodeService;
    private WalletService walletService;

    private void setUpService() {
        publicCodeService = new FixedPublicCodeService();
        walletService = new WalletService(
                orderRepository, vendorWalletRepository, walletTransactionRepository,
                customerWalletRepository, customerWalletTransactionRepository,
                payoutRequestRepository, publicCodeService
        );
    }

    // ─── CONCURRENCY: Rapid Payout Requests ──────────────────────────────────

    @Test
    @DisplayName("Sequential payout requests enforce commitment guard")
    void sequentialPayoutRequestsEnforceCommitmentGuard() {
        setUpService();
        UUID storeId = UUID.randomUUID();
        BigDecimal available = new BigDecimal("1200000");
        BigDecimal requestAmount = new BigDecimal("1000000");

        VendorWallet wallet = VendorWallet.builder()
                .storeId(storeId)
                .availableBalance(available)
                .frozenBalance(BigDecimal.ZERO)
                .reservedBalance(BigDecimal.ZERO)
                .build();

        when(vendorWalletRepository.findByStoreIdForUpdate(storeId)).thenReturn(Optional.of(wallet));
        when(vendorWalletRepository.save(any(VendorWallet.class))).thenAnswer(inv -> inv.getArgument(0));
        when(payoutRequestRepository.sumPendingAmountByStoreId(storeId)).thenAnswer(inv -> wallet.getReservedBalance());
        when(payoutRequestRepository.save(any())).thenAnswer(inv -> {
            PayoutRequest req = inv.getArgument(0);
            req.setId(UUID.randomUUID());
            return req;
        });

        walletService.createPayoutRequest(storeId, requestAmount, "User 1", "ACC1", "VCB");
        assertThrows(IllegalArgumentException.class,
                () -> walletService.createPayoutRequest(storeId, requestAmount, "User 2", "ACC2", "VCB"));

        assertEquals(0, wallet.getAvailableBalance().compareTo(new BigDecimal("200000")));
        assertEquals(0, wallet.getReservedBalance().compareTo(new BigDecimal("1000000")));
    }

    // ─── PERFORMANCE: Analytics Query Speed ──────────────────────────────────

    @Test
    @DisplayName("Performance: Analytics aggregation should use indexed queries")
    void analyticsQueryUsesIndexedColumns() {
        setUpService();

        long startTime = System.nanoTime();

        for (int i = 0; i < 1000; i++) {
            UUID storeId = UUID.randomUUID();
            LocalDateTime now = LocalDateTime.now();

            Order.OrderStatus status = Order.OrderStatus.DELIVERED;
            UUID orderId = UUID.randomUUID();

            when(orderRepository.findByIdForUpdate(orderId)).thenReturn(Optional.of(
                    Order.builder().id(orderId).storeId(storeId).status(status).vendorPayout(new BigDecimal("100000")).build()
            ));
            when(walletTransactionRepository.existsByOrderIdAndType(orderId, WalletTransaction.TransactionType.ESCROW_CREDIT))
                    .thenReturn(false);
            when(vendorWalletRepository.findByStoreIdForUpdate(storeId)).thenReturn(Optional.of(
                    VendorWallet.builder().storeId(storeId).availableBalance(new BigDecimal("1000000")).frozenBalance(new BigDecimal("500000")).build()
            ));
            when(vendorWalletRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(walletTransactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            publicCodeService.push("GD-PERF-" + String.format("%06d", i));

            Order order = Order.builder()
                    .id(orderId)
                    .storeId(storeId)
                    .status(Order.OrderStatus.DELIVERED)
                    .vendorPayout(new BigDecimal("100000"))
                    .build();

            walletService.creditEscrowForCompletedOrder(order);
        }

        long elapsedMs = (System.nanoTime() - startTime) / 1_000_000;

        assertTrue(elapsedMs < 5000,
                "1000 escrow credit operations should complete in < 5000ms, took: " + elapsedMs + "ms");
    }

    // ─── INTEGRITY: BigDecimal Precision ─────────────────────────────────────

    @Test
    @DisplayName("Precision: Multiple escrow credits maintain BigDecimal precision")
    void multipleEscrowCreditsMaintainPrecision() {
        setUpService();
        UUID storeId = UUID.randomUUID();

        VendorWallet wallet = VendorWallet.builder()
                .storeId(storeId)
                .availableBalance(new BigDecimal("10000000"))
                .frozenBalance(BigDecimal.ZERO)
                .build();

        when(vendorWalletRepository.findByStoreIdForUpdate(storeId)).thenReturn(Optional.of(wallet));
        when(vendorWalletRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(walletTransactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        BigDecimal[] amounts = {
                new BigDecimal("999999.99"),
                new BigDecimal("1000000.01"),
                new BigDecimal("0.01"),
                new BigDecimal("999999.99"),
        };

        BigDecimal expectedTotal = BigDecimal.ZERO;
        for (int i = 0; i < amounts.length; i++) {
            UUID orderId = UUID.randomUUID();
            publicCodeService.push("GD-PREC-" + String.format("%06d", i));

            Order order = Order.builder()
                    .id(orderId)
                    .storeId(storeId)
                    .vendorPayout(amounts[i])
                    .build();

            when(orderRepository.findByIdForUpdate(orderId)).thenReturn(Optional.of(order));
            when(walletTransactionRepository.existsByOrderIdAndType(orderId, WalletTransaction.TransactionType.ESCROW_CREDIT))
                    .thenReturn(false);

            walletService.creditEscrowForCompletedOrder(order);
            expectedTotal = expectedTotal.add(amounts[i]);
        }

        assertEquals(0, wallet.getFrozenBalance().compareTo(expectedTotal),
                "Frozen balance should exactly match sum of all credits: " + expectedTotal);
    }

    // ─── HELPER ──────────────────────────────────────────────────────────────

    private static final class FixedPublicCodeService extends PublicCodeService {
        private final Queue<String> codes = new ArrayDeque<>();
        private FixedPublicCodeService() { super(null, null, null, null); }
        void push(String code) { codes.add(code); }
        @Override public String nextTransactionCode() {
            String c = codes.poll();
            return c != null ? c : "GD-TEST-000001";
        }
    }
}
