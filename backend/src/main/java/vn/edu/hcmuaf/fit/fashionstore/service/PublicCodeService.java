package vn.edu.hcmuaf.fit.fashionstore.service;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmuaf.fit.fashionstore.entity.Order;
import vn.edu.hcmuaf.fit.fashionstore.entity.PublicCodeCounter;
import vn.edu.hcmuaf.fit.fashionstore.entity.PublicCodeType;
import vn.edu.hcmuaf.fit.fashionstore.entity.ReturnRequest;
import vn.edu.hcmuaf.fit.fashionstore.entity.WalletTransaction;
import vn.edu.hcmuaf.fit.fashionstore.repository.OrderRepository;
import vn.edu.hcmuaf.fit.fashionstore.repository.PublicCodeCounterRepository;
import vn.edu.hcmuaf.fit.fashionstore.repository.ReturnRequestRepository;
import vn.edu.hcmuaf.fit.fashionstore.repository.WalletTransactionRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Service
public class PublicCodeService {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyMMdd");
    private static final int MAX_SEQUENCE_RETRY = 5;

    private final PublicCodeCounterRepository publicCodeCounterRepository;
    private final OrderRepository orderRepository;
    private final ReturnRequestRepository returnRequestRepository;
    private final WalletTransactionRepository walletTransactionRepository;

    public PublicCodeService(
            PublicCodeCounterRepository publicCodeCounterRepository,
            OrderRepository orderRepository,
            ReturnRequestRepository returnRequestRepository,
            WalletTransactionRepository walletTransactionRepository
    ) {
        this.publicCodeCounterRepository = publicCodeCounterRepository;
        this.orderRepository = orderRepository;
        this.returnRequestRepository = returnRequestRepository;
        this.walletTransactionRepository = walletTransactionRepository;
    }

    @Transactional
    public String nextOrderCode() {
        return nextCode(PublicCodeType.ORDER, null);
    }

    @Transactional
    public String nextOrderCode(LocalDateTime referenceDateTime) {
        return nextCode(PublicCodeType.ORDER, referenceDateTime);
    }

    @Transactional
    public String nextReturnCode() {
        return nextCode(PublicCodeType.RETURN, null);
    }

    @Transactional
    public String nextReturnCode(LocalDateTime referenceDateTime) {
        return nextCode(PublicCodeType.RETURN, referenceDateTime);
    }

    @Transactional
    public String nextTransactionCode() {
        return nextCode(PublicCodeType.TRANSACTION, null);
    }

    @Transactional
    public String nextTransactionCode(LocalDateTime referenceDateTime) {
        return nextCode(PublicCodeType.TRANSACTION, referenceDateTime);
    }

    @Transactional
    public void assignOrderCodeIfMissing(Order order) {
        if (order == null || hasText(order.getOrderCode())) {
            return;
        }
        order.setOrderCode(nextOrderCode(order.getCreatedAt()));
    }

    @Transactional
    public void assignReturnCodeIfMissing(ReturnRequest request) {
        if (request == null || hasText(request.getReturnCode())) {
            return;
        }
        request.setReturnCode(nextReturnCode(request.getCreatedAt()));
    }

    @Transactional
    public void assignTransactionCodeIfMissing(WalletTransaction transaction) {
        if (transaction == null || hasText(transaction.getTransactionCode())) {
            return;
        }
        transaction.setTransactionCode(nextTransactionCode(transaction.getCreatedAt()));
    }

    private String nextCode(PublicCodeType type, LocalDateTime referenceDateTime) {
        LocalDate codeDate = resolveBusinessDate(referenceDateTime);
        long nextSequence = reserveSequence(type, codeDate);
        return "%s-%s-%06d".formatted(prefix(type), codeDate.format(DATE_FORMATTER), nextSequence);
    }

    private LocalDate resolveBusinessDate(LocalDateTime referenceDateTime) {
        if (referenceDateTime == null) {
            return LocalDate.now(BUSINESS_ZONE);
        }
        return referenceDateTime.atZone(BUSINESS_ZONE).toLocalDate();
    }

    private long reserveSequence(PublicCodeType type, LocalDate codeDate) {
        for (int attempt = 0; attempt < MAX_SEQUENCE_RETRY; attempt++) {
            try {
                PublicCodeCounter counter = publicCodeCounterRepository.findByCodeTypeAndCodeDate(type, codeDate)
                        .orElseGet(() -> PublicCodeCounter.builder()
                                .codeType(type)
                                .codeDate(codeDate)
                                .lastValue(resolveExistingMaxSequence(type, codeDate))
                                .build());
                long nextValue = counter.getLastValue() + 1L;
                counter.setLastValue(nextValue);
                publicCodeCounterRepository.saveAndFlush(counter);
                return nextValue;
            } catch (DataIntegrityViolationException ex) {
                // Row created concurrently by another transaction, retry with lock.
            }
        }
        throw new IllegalStateException("Unable to allocate public code sequence for " + type + " at " + codeDate);
    }

    private long resolveExistingMaxSequence(PublicCodeType type, LocalDate codeDate) {
        String prefixWithDate = "%s-%s-".formatted(prefix(type), codeDate.format(DATE_FORMATTER));
        return switch (type) {
            case ORDER -> orderRepository.findTopByOrderCodeStartingWithOrderByOrderCodeDesc(prefixWithDate)
                    .map(Order::getOrderCode)
                    .map(this::parseSequence)
                    .orElse(0L);
            case RETURN -> returnRequestRepository.findTopByReturnCodeStartingWithOrderByReturnCodeDesc(prefixWithDate)
                    .map(ReturnRequest::getReturnCode)
                    .map(this::parseSequence)
                    .orElse(0L);
            case TRANSACTION -> walletTransactionRepository.findTopByTransactionCodeStartingWithOrderByTransactionCodeDesc(prefixWithDate)
                    .map(WalletTransaction::getTransactionCode)
                    .map(this::parseSequence)
                    .orElse(0L);
        };
    }

    private long parseSequence(String code) {
        if (!hasText(code)) {
            return 0L;
        }
        int index = code.lastIndexOf('-');
        if (index < 0 || index >= code.length() - 1) {
            return 0L;
        }
        try {
            return Long.parseLong(code.substring(index + 1));
        } catch (NumberFormatException ex) {
            return 0L;
        }
    }

    private String prefix(PublicCodeType type) {
        return switch (type) {
            case ORDER -> "DH";
            case RETURN -> "TH";
            case TRANSACTION -> "GD";
        };
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
