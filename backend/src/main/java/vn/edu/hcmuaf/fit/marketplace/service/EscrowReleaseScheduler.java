package vn.edu.hcmuaf.fit.marketplace.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmuaf.fit.marketplace.entity.Order;
import vn.edu.hcmuaf.fit.marketplace.entity.WalletTransaction;
import vn.edu.hcmuaf.fit.marketplace.repository.OrderRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.VendorWalletRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.WalletTransactionRepository;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class EscrowReleaseScheduler {
    private static final Logger log = LoggerFactory.getLogger(EscrowReleaseScheduler.class);
    private static final int ESCROW_HOLD_DAYS = 7;

    private final OrderRepository orderRepository;
    private final VendorWalletRepository vendorWalletRepository;
    private final WalletTransactionRepository walletTransactionRepository;
    private final WalletService walletService;
    private final PublicCodeService publicCodeService;

    public EscrowReleaseScheduler(OrderRepository orderRepository,
                                   VendorWalletRepository vendorWalletRepository,
                                   WalletTransactionRepository walletTransactionRepository,
                                   WalletService walletService,
                                   PublicCodeService publicCodeService) {
        this.orderRepository = orderRepository;
        this.vendorWalletRepository = vendorWalletRepository;
        this.walletTransactionRepository = walletTransactionRepository;
        this.walletService = walletService;
        this.publicCodeService = publicCodeService;
    }

    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void releaseMaturedEscrow() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(ESCROW_HOLD_DAYS);

        List<WalletTransaction> escrowCredits = walletTransactionRepository
                .findByTypeAndCreatedAtBeforeOrderByCreatedAtAsc(
                        WalletTransaction.TransactionType.ESCROW_CREDIT, cutoff);

        int released = 0;
        for (WalletTransaction tx : escrowCredits) {
            if (tx.getOrderId() == null) continue;

            boolean alreadyReleased = walletTransactionRepository.existsByOrderIdAndType(
                    tx.getOrderId(),
                    WalletTransaction.TransactionType.ESCROW_RELEASE
            );
            if (alreadyReleased) continue;

            Order order = orderRepository.findById(tx.getOrderId()).orElse(null);
            if (order == null || order.getStoreId() == null) continue;

            if (order.getStatus() != Order.OrderStatus.DELIVERED) continue;

            try {
                walletService.releaseEscrowToAvailable(order.getStoreId(), order.getId(), tx.getAmount());
                released++;
            } catch (Exception e) {
                log.error("Failed to release escrow for order {}: {}", order.getId(), e.getMessage());
            }
        }

        if (released > 0) {
            log.info("Escrow release job completed: {} orders released from {}-day hold", released, ESCROW_HOLD_DAYS);
        }
    }
}
