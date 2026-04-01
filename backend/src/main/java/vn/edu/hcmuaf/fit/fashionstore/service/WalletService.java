package vn.edu.hcmuaf.fit.fashionstore.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmuaf.fit.fashionstore.entity.Order;
import vn.edu.hcmuaf.fit.fashionstore.entity.VendorWallet;
import vn.edu.hcmuaf.fit.fashionstore.entity.WalletTransaction;
import vn.edu.hcmuaf.fit.fashionstore.exception.ResourceNotFoundException;
import vn.edu.hcmuaf.fit.fashionstore.repository.OrderRepository;
import vn.edu.hcmuaf.fit.fashionstore.repository.VendorWalletRepository;
import vn.edu.hcmuaf.fit.fashionstore.repository.WalletTransactionRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class WalletService {

    private final OrderRepository orderRepository;
    private final VendorWalletRepository vendorWalletRepository;
    private final WalletTransactionRepository walletTransactionRepository;
    private final PublicCodeService publicCodeService;

    public WalletService(OrderRepository orderRepository,
                         VendorWalletRepository vendorWalletRepository,
                         WalletTransactionRepository walletTransactionRepository,
                         PublicCodeService publicCodeService) {
        this.orderRepository = orderRepository;
        this.vendorWalletRepository = vendorWalletRepository;
        this.walletTransactionRepository = walletTransactionRepository;
        this.publicCodeService = publicCodeService;
    }

    @Transactional
    public void creditVendorForOrder(Order order) {
        if (order == null || order.getId() == null) {
            return;
        }

        Order lockedOrder = orderRepository.findByIdForUpdate(order.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        if (lockedOrder.getStoreId() == null) {
            return; // Only credit orders that belong to a vendor store
        }

        if (walletTransactionRepository.existsByOrderIdAndType(
                lockedOrder.getId(),
                WalletTransaction.TransactionType.CREDIT
        )) {
            return; // Idempotent: payout already credited for this order
        }

        VendorWallet wallet = vendorWalletRepository.findByStoreId(lockedOrder.getStoreId())
                .orElseGet(() -> createWallet(lockedOrder.getStoreId()));

        BigDecimal amount = lockedOrder.getVendorPayout();
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }

        wallet.setBalance(wallet.getBalance().add(amount));
        wallet.setLastUpdated(LocalDateTime.now());
        vendorWalletRepository.save(wallet);

        WalletTransaction transaction = WalletTransaction.builder()
                .transactionCode(publicCodeService.nextTransactionCode())
                .wallet(wallet)
                .orderId(lockedOrder.getId())
                .amount(amount)
                .type(WalletTransaction.TransactionType.CREDIT)
                .description("Payout for Order " + (lockedOrder.getOrderCode() != null ? lockedOrder.getOrderCode() : lockedOrder.getId()))
                .build();
        
        walletTransactionRepository.save(transaction);
    }

    @Transactional
    public void debitVendorForRefund(Order order) {
        if (!order.isSubOrder()) {
            return;
        }

        VendorWallet wallet = vendorWalletRepository.findByStoreId(order.getStoreId())
                .orElseGet(() -> createWallet(order.getStoreId()));

        BigDecimal amount = order.getVendorPayout();
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }

        wallet.setBalance(wallet.getBalance().subtract(amount));
        wallet.setLastUpdated(LocalDateTime.now());
        vendorWalletRepository.save(wallet);

        WalletTransaction transaction = WalletTransaction.builder()
                .transactionCode(publicCodeService.nextTransactionCode())
                .wallet(wallet)
                .orderId(order.getId())
                .amount(amount)
                .type(WalletTransaction.TransactionType.DEBIT)
                .description("Refund for Order " + (order.getOrderCode() != null ? order.getOrderCode() : order.getId()))
                .build();
        
        walletTransactionRepository.save(transaction);
    }

    private VendorWallet createWallet(UUID storeId) {
        return vendorWalletRepository.save(VendorWallet.builder()
                .storeId(storeId)
                .balance(BigDecimal.ZERO)
                .lastUpdated(LocalDateTime.now())
                .build());
    }

    @Transactional(readOnly = true)
    public VendorWallet getWallet(UUID storeId) {
        return vendorWalletRepository.findByStoreId(storeId)
                .orElseGet(() -> createWallet(storeId));
    }

    @Transactional(readOnly = true)
    public java.util.List<VendorWallet> getAllWallets() {
        return vendorWalletRepository.findAll();
    }

    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<WalletTransaction> getTransactions(UUID storeId, org.springframework.data.domain.Pageable pageable) {
        VendorWallet wallet = getWallet(storeId);
        return walletTransactionRepository.findByWalletId(wallet.getId(), pageable);
    }

    @Transactional
    public WalletTransaction withdraw(UUID storeId, BigDecimal amount, String note) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Withdrawal amount must be greater than zero");
        }

        VendorWallet wallet = vendorWalletRepository.findByStoreId(storeId)
                .orElseThrow(() -> new IllegalArgumentException("Wallet not found"));

        if (wallet.getBalance().compareTo(amount) < 0) {
            throw new IllegalArgumentException("Insufficient balance");
        }

        wallet.setBalance(wallet.getBalance().subtract(amount));
        wallet.setLastUpdated(LocalDateTime.now());
        vendorWalletRepository.save(wallet);

        WalletTransaction transaction = WalletTransaction.builder()
                .transactionCode(publicCodeService.nextTransactionCode())
                .wallet(wallet)
                .amount(amount)
                .type(WalletTransaction.TransactionType.WITHDRAWAL)
                .description(note != null ? note : "Admin withdrawal")
                .build();

        return walletTransactionRepository.save(transaction);
    }
}
