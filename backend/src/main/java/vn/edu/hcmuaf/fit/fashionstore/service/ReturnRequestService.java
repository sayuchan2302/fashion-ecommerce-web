package vn.edu.hcmuaf.fit.fashionstore.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmuaf.fit.fashionstore.dto.request.ReturnStatusUpdateRequest;
import vn.edu.hcmuaf.fit.fashionstore.dto.request.ReturnSubmitRequest;
import vn.edu.hcmuaf.fit.fashionstore.dto.response.ReturnRequestResponse;
import vn.edu.hcmuaf.fit.fashionstore.entity.Order;
import vn.edu.hcmuaf.fit.fashionstore.entity.OrderItem;
import vn.edu.hcmuaf.fit.fashionstore.entity.ReturnRequest;
import vn.edu.hcmuaf.fit.fashionstore.repository.OrderRepository;
import vn.edu.hcmuaf.fit.fashionstore.repository.ReturnRequestRepository;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ReturnRequestService {

    private final ReturnRequestRepository returnRequestRepository;
    private final OrderRepository orderRepository;
    private final vn.edu.hcmuaf.fit.fashionstore.repository.StoreRepository storeRepository;
    private final PublicCodeService publicCodeService;

    public ReturnRequestService(
            ReturnRequestRepository returnRequestRepository,
            OrderRepository orderRepository,
            vn.edu.hcmuaf.fit.fashionstore.repository.StoreRepository storeRepository,
            PublicCodeService publicCodeService
    ) {
        this.returnRequestRepository = returnRequestRepository;
        this.orderRepository = orderRepository;
        this.storeRepository = storeRepository;
        this.publicCodeService = publicCodeService;
    }

    @Transactional
    public ReturnRequestResponse submit(UUID userId, ReturnSubmitRequest payload) {
        Order order = orderRepository.findById(payload.getOrderId())
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        if (!order.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Order does not belong to user");
        }

        Map<UUID, OrderItem> orderItemMap = order.getItems().stream()
                .collect(Collectors.toMap(OrderItem::getId, oi -> oi));

        List<ReturnRequest.ReturnItemSnapshot> snapshots = payload.getItems().stream().map(itemPayload -> {
            OrderItem matched = orderItemMap.get(itemPayload.getOrderItemId());
            if (matched == null) {
                throw new IllegalArgumentException("Invalid order item");
            }
            int qty = itemPayload.getQuantity() == null ? matched.getQuantity() : itemPayload.getQuantity();
            return new ReturnRequest.ReturnItemSnapshot(
                    matched.getId(),
                    matched.getProductName(),
                    matched.getVariantName(),
                    matched.getProductImage(),
                    qty,
                    matched.getUnitPrice()
            );
        }).toList();

        ReturnRequest request = ReturnRequest.builder()
                .returnCode(publicCodeService.nextReturnCode())
                .order(order)
                .user(order.getUser())
                .reason(payload.getReason())
                .note(payload.getNote())
                .resolution(payload.getResolution())
                .status(ReturnRequest.ReturnStatus.PENDING)
                .items(snapshots)
                .build();

        return toResponse(returnRequestRepository.save(request));
    }

    @Transactional(readOnly = true)
    public Page<ReturnRequestResponse> list(ReturnRequest.ReturnStatus status, Pageable pageable) {
        Page<ReturnRequest> page = status == null
                ? returnRequestRepository.findAll(pageable)
                : returnRequestRepository.findByStatus(status, pageable);
        return page.map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public ReturnRequestResponse get(UUID id) {
        ReturnRequest request = returnRequestRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Return request not found"));
        return toResponse(request);
    }

    @Transactional(readOnly = true)
    public ReturnRequestResponse getByCode(String code) {
        ReturnRequest request = returnRequestRepository.findByReturnCode(code)
                .orElseThrow(() -> new IllegalArgumentException("Return request not found"));
        return toResponse(request);
    }

    @Transactional
    public ReturnRequestResponse updateStatus(UUID id, ReturnStatusUpdateRequest payload, String updatedBy) {
        ReturnRequest request = returnRequestRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Return request not found"));

        if (!isValidTransition(request.getStatus(), payload.getStatus())) {
            throw new IllegalArgumentException("Invalid status transition");
        }

        request.setStatus(payload.getStatus());
        request.setAdminNote(payload.getAdminNote());
        request.setUpdatedBy(updatedBy);

        return toResponse(returnRequestRepository.save(request));
    }

    private boolean isValidTransition(ReturnRequest.ReturnStatus current, ReturnRequest.ReturnStatus next) {
        if (current == ReturnRequest.ReturnStatus.PENDING) {
            return next == ReturnRequest.ReturnStatus.APPROVED || next == ReturnRequest.ReturnStatus.REJECTED;
        }
        if (current == ReturnRequest.ReturnStatus.APPROVED) {
            return next == ReturnRequest.ReturnStatus.COMPLETED || next == ReturnRequest.ReturnStatus.REJECTED;
        }
        return false;
    }

    private ReturnRequestResponse toResponse(ReturnRequest request) {
        return ReturnRequestResponse.builder()
                .id(request.getId())
                .code(request.getReturnCode())
                .orderId(request.getOrder().getId())
                .orderCode(request.getOrder().getOrderCode())
                .userId(request.getUser().getId())
                .customerName(request.getUser().getName())
                .customerEmail(request.getUser().getEmail())
                .customerPhone(request.getUser().getPhone())
                .reason(request.getReason())
                .note(request.getNote())
                .resolution(request.getResolution())
                .status(request.getStatus())
                .items(request.getItems().stream().map(item ->
                        ReturnRequestResponse.ReturnItem.builder()
                                .orderItemId(item.getOrderItemId())
                                .productName(item.getProductName())
                                .variantName(item.getVariantName())
                                .imageUrl(item.getImageUrl())
                                .quantity(item.getQuantity())
                                .unitPrice(item.getUnitPrice())
                                .build()
                ).toList())
                .storeId(request.getOrder().getStoreId())
                .storeName(request.getOrder().getStoreId() != null ? 
                        storeRepository.findById(request.getOrder().getStoreId())
                                .map(vn.edu.hcmuaf.fit.fashionstore.entity.Store::getName)
                                .orElse(null) : null)
                .adminNote(request.getAdminNote())
                .updatedBy(request.getUpdatedBy())
                .createdAt(request.getCreatedAt())
                .updatedAt(request.getUpdatedAt())
                .build();
    }
}
