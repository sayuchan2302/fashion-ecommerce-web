package vn.edu.hcmuaf.fit.marketplace.service;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmuaf.fit.marketplace.entity.Order;
import vn.edu.hcmuaf.fit.marketplace.entity.ReturnRequest;
import vn.edu.hcmuaf.fit.marketplace.entity.WalletTransaction;
import vn.edu.hcmuaf.fit.marketplace.repository.OrderRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.ReturnRequestRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.WalletTransactionRepository;

import java.util.List;

@Component
public class PublicCodeBackfillInitializer {

    private final OrderRepository orderRepository;
    private final ReturnRequestRepository returnRequestRepository;
    private final WalletTransactionRepository walletTransactionRepository;
    private final PublicCodeService publicCodeService;

    public PublicCodeBackfillInitializer(
            OrderRepository orderRepository,
            ReturnRequestRepository returnRequestRepository,
            WalletTransactionRepository walletTransactionRepository,
            PublicCodeService publicCodeService
    ) {
        this.orderRepository = orderRepository;
        this.returnRequestRepository = returnRequestRepository;
        this.walletTransactionRepository = walletTransactionRepository;
        this.publicCodeService = publicCodeService;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void backfillMissingPublicCodes() {
        backfillOrders();
        backfillReturnRequests();
        backfillWalletTransactions();
    }

    private void backfillOrders() {
        List<Order> missingOrders = orderRepository.findByOrderCodeIsNullOrderByCreatedAtAscIdAsc();
        if (missingOrders.isEmpty()) {
            return;
        }
        for (Order order : missingOrders) {
            publicCodeService.assignOrderCodeIfMissing(order);
        }
        orderRepository.saveAll(missingOrders);
    }

    private void backfillReturnRequests() {
        List<ReturnRequest> missingRequests = returnRequestRepository.findByReturnCodeIsNullOrderByCreatedAtAscIdAsc();
        if (missingRequests.isEmpty()) {
            return;
        }
        for (ReturnRequest request : missingRequests) {
            publicCodeService.assignReturnCodeIfMissing(request);
        }
        returnRequestRepository.saveAll(missingRequests);
    }

    private void backfillWalletTransactions() {
        List<WalletTransaction> missingTransactions = walletTransactionRepository.findByTransactionCodeIsNullOrderByCreatedAtAscIdAsc();
        if (missingTransactions.isEmpty()) {
            return;
        }
        for (WalletTransaction transaction : missingTransactions) {
            publicCodeService.assignTransactionCodeIfMissing(transaction);
        }
        walletTransactionRepository.saveAll(missingTransactions);
    }
}
