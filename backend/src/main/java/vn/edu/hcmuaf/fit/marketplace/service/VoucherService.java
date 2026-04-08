package vn.edu.hcmuaf.fit.marketplace.service;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import vn.edu.hcmuaf.fit.marketplace.dto.request.VoucherRequest;
import vn.edu.hcmuaf.fit.marketplace.dto.request.VoucherStatusUpdateRequest;
import vn.edu.hcmuaf.fit.marketplace.dto.response.VoucherListResponse;
import vn.edu.hcmuaf.fit.marketplace.dto.response.VoucherResponse;
import java.math.BigDecimal;
import vn.edu.hcmuaf.fit.marketplace.entity.Store;
import vn.edu.hcmuaf.fit.marketplace.entity.Voucher;
import vn.edu.hcmuaf.fit.marketplace.repository.StoreRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.VoucherRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

@Service
public class VoucherService {

    private final VoucherRepository voucherRepository;
    private final StoreRepository storeRepository;

    public VoucherService(VoucherRepository voucherRepository, StoreRepository storeRepository) {
        this.voucherRepository = voucherRepository;
        this.storeRepository = storeRepository;
    }

    @Transactional(readOnly = true)
    public VoucherListResponse list(UUID storeId, Voucher.VoucherStatus status, String keyword, Pageable pageable) {
        String normalizedKeyword = normalizeKeyword(keyword);
        Page<Voucher> page = voucherRepository.searchByStore(storeId, status, normalizedKeyword, pageable);

        return VoucherListResponse.builder()
                .items(page.map(this::toResponse).getContent())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .page(pageable.getPageNumber() + 1)
                .pageSize(pageable.getPageSize())
                .totalUsage(voucherRepository.sumUsedCountByStoreId(storeId))
                .counts(VoucherListResponse.Counts.builder()
                        .all(voucherRepository.countByStoreId(storeId))
                        .running(voucherRepository.countByStoreIdAndStatus(storeId, Voucher.VoucherStatus.RUNNING))
                        .paused(voucherRepository.countByStoreIdAndStatus(storeId, Voucher.VoucherStatus.PAUSED))
                        .draft(voucherRepository.countByStoreIdAndStatus(storeId, Voucher.VoucherStatus.DRAFT))
                        .build())
                .build();
    }

    @Transactional(readOnly = true)
    public VoucherListResponse listAdmin(Voucher.VoucherStatus status, String keyword, Pageable pageable) {
        String normalizedKeyword = normalizeKeyword(keyword);
        Page<Voucher> page = voucherRepository.searchAll(status, normalizedKeyword, pageable);

        return VoucherListResponse.builder()
                .items(page.map(this::toResponse).getContent())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .page(pageable.getPageNumber() + 1)
                .pageSize(pageable.getPageSize())
                .totalUsage(voucherRepository.sumUsedCount())
                .counts(VoucherListResponse.Counts.builder()
                        .all(voucherRepository.count())
                        .running(voucherRepository.countByStatus(Voucher.VoucherStatus.RUNNING))
                        .paused(voucherRepository.countByStatus(Voucher.VoucherStatus.PAUSED))
                        .draft(voucherRepository.countByStatus(Voucher.VoucherStatus.DRAFT))
                        .build())
                .build();
    }

    @Transactional(readOnly = true)
    public List<VoucherResponse> listPublic(List<UUID> storeIds) {
        LocalDate today = LocalDate.now();
        List<Voucher> vouchers;
        List<UUID> normalizedStoreIds = storeIds == null
                ? List.of()
                : storeIds.stream().filter(Objects::nonNull).distinct().toList();

        if (normalizedStoreIds.isEmpty()) {
            vouchers = voucherRepository.findPublicAvailable(Voucher.VoucherStatus.RUNNING, today);
        } else {
            vouchers = voucherRepository.findPublicAvailableByStoreIds(
                    Voucher.VoucherStatus.RUNNING,
                    normalizedStoreIds,
                    today
            );
        }

        return vouchers.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public VoucherResponse get(UUID storeId, UUID voucherId) {
        Voucher voucher = getOwnedVoucher(storeId, voucherId);
        return toResponse(voucher);
    }

    @Transactional(readOnly = true)
    public VoucherResponse getAdmin(UUID voucherId) {
        return toResponse(getVoucherById(voucherId));
    }

    @Transactional
    public VoucherResponse create(UUID storeId, VoucherRequest request, String actor) {
        validateRequest(request);
        String normalizedCode = normalizeCode(request.getCode());

        Voucher voucher = Voucher.builder()
                .storeId(storeId)
                .name(request.getName().trim())
                .code(normalizedCode)
                .description(normalizeDescription(request.getDescription()))
                .discountType(request.getDiscountType())
                .discountValue(request.getDiscountValue())
                .minOrderValue(safeMinOrder(request.getMinOrderValue()))
                .totalIssued(request.getTotalIssued())
                .usedCount(0)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .status(request.getStatus() == null ? Voucher.VoucherStatus.DRAFT : request.getStatus())
                .updatedBy(actor)
                .build();

        try {
            Voucher saved = voucherRepository.save(voucher);
            return toResponse(saved);
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Voucher code already exists in this store");
        }
    }

    @Transactional
    public VoucherResponse createAdmin(VoucherRequest request, String actor) {
        validateRequest(request);
        UUID storeId = resolveStoreIdForAdmin(request);
        String normalizedCode = normalizeCode(request.getCode());

        Voucher voucher = Voucher.builder()
                .storeId(storeId)
                .name(request.getName().trim())
                .code(normalizedCode)
                .description(normalizeDescription(request.getDescription()))
                .discountType(request.getDiscountType())
                .discountValue(request.getDiscountValue())
                .minOrderValue(safeMinOrder(request.getMinOrderValue()))
                .totalIssued(request.getTotalIssued())
                .usedCount(0)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .status(request.getStatus() == null ? Voucher.VoucherStatus.DRAFT : request.getStatus())
                .updatedBy(actor)
                .build();

        try {
            Voucher saved = voucherRepository.save(voucher);
            return toResponse(saved);
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Voucher code already exists in this store");
        }
    }

    @Transactional
    public VoucherResponse update(UUID storeId, UUID voucherId, VoucherRequest request, String actor) {
        validateRequest(request);
        Voucher voucher = getOwnedVoucher(storeId, voucherId);
        String normalizedCode = normalizeCode(request.getCode());

        if (request.getTotalIssued() < safeUsedCount(voucher.getUsedCount())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Total issued cannot be less than used count");
        }

        voucher.setName(request.getName().trim());
        voucher.setCode(normalizedCode);
        voucher.setDescription(normalizeDescription(request.getDescription()));
        voucher.setDiscountType(request.getDiscountType());
        voucher.setDiscountValue(request.getDiscountValue());
        voucher.setMinOrderValue(safeMinOrder(request.getMinOrderValue()));
        voucher.setTotalIssued(request.getTotalIssued());
        voucher.setStartDate(request.getStartDate());
        voucher.setEndDate(request.getEndDate());
        if (request.getStatus() != null) {
            voucher.setStatus(request.getStatus());
        }
        voucher.setUpdatedBy(actor);

        try {
            Voucher saved = voucherRepository.save(voucher);
            return toResponse(saved);
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Voucher code already exists in this store");
        }
    }

    @Transactional
    public VoucherResponse updateAdmin(UUID voucherId, VoucherRequest request, String actor) {
        validateRequest(request);
        Voucher voucher = getVoucherById(voucherId);
        UUID nextStoreId = request.getStoreId() != null ? request.getStoreId() : voucher.getStoreId();
        if (nextStoreId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Store is required");
        }
        ensureStoreExists(nextStoreId);
        String normalizedCode = normalizeCode(request.getCode());

        if (request.getTotalIssued() < safeUsedCount(voucher.getUsedCount())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Total issued cannot be less than used count");
        }

        voucher.setStoreId(nextStoreId);
        voucher.setName(request.getName().trim());
        voucher.setCode(normalizedCode);
        voucher.setDescription(normalizeDescription(request.getDescription()));
        voucher.setDiscountType(request.getDiscountType());
        voucher.setDiscountValue(request.getDiscountValue());
        voucher.setMinOrderValue(safeMinOrder(request.getMinOrderValue()));
        voucher.setTotalIssued(request.getTotalIssued());
        voucher.setStartDate(request.getStartDate());
        voucher.setEndDate(request.getEndDate());
        if (request.getStatus() != null) {
            voucher.setStatus(request.getStatus());
        }
        voucher.setUpdatedBy(actor);

        try {
            Voucher saved = voucherRepository.save(voucher);
            return toResponse(saved);
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Voucher code already exists in this store");
        }
    }

    @Transactional
    public VoucherResponse updateStatus(UUID storeId, UUID voucherId, VoucherStatusUpdateRequest request, String actor) {
        Voucher voucher = getOwnedVoucher(storeId, voucherId);
        voucher.setStatus(request.getStatus());
        voucher.setUpdatedBy(actor);
        Voucher saved = voucherRepository.save(voucher);
        return toResponse(saved);
    }

    @Transactional
    public VoucherResponse updateAdminStatus(UUID voucherId, VoucherStatusUpdateRequest request, String actor) {
        Voucher voucher = getVoucherById(voucherId);
        voucher.setStatus(request.getStatus());
        voucher.setUpdatedBy(actor);
        return toResponse(voucherRepository.save(voucher));
    }

    @Transactional
    public void delete(UUID storeId, UUID voucherId) {
        Voucher voucher = getOwnedVoucher(storeId, voucherId);
        voucherRepository.delete(voucher);
    }

    @Transactional
    public void deleteAdmin(UUID voucherId) {
        voucherRepository.delete(getVoucherById(voucherId));
    }

    private Voucher getOwnedVoucher(UUID storeId, UUID voucherId) {
        return voucherRepository.findByIdAndStoreId(voucherId, storeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Voucher not found"));
    }

    private Voucher getVoucherById(UUID voucherId) {
        return voucherRepository.findById(voucherId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Voucher not found"));
    }

    private UUID resolveStoreIdForAdmin(VoucherRequest request) {
        if (request.getStoreId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Store is required");
        }
        ensureStoreExists(request.getStoreId());
        return request.getStoreId();
    }

    private void ensureStoreExists(UUID storeId) {
        storeRepository.findById(storeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Store not found"));
    }

    private void validateRequest(VoucherRequest request) {
        if (request.getStartDate() != null && request.getEndDate() != null
                && request.getEndDate().isBefore(request.getStartDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "End date must be after start date");
        }

        if (request.getDiscountType() == Voucher.DiscountType.PERCENT && request.getDiscountValue().compareTo(new BigDecimal("100")) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Percent discount cannot exceed 100");
        }
    }

    private String normalizeCode(String rawCode) {
        String normalized = rawCode == null ? "" : rawCode.replaceAll("\\s+", "").toUpperCase(Locale.ROOT);
        if (normalized.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Voucher code is required");
        }
        return normalized;
    }

    private String normalizeKeyword(String keyword) {
        if (keyword == null) {
            return null;
        }
        String normalized = keyword.trim().toLowerCase(Locale.ROOT);
        return normalized.isEmpty() ? null : normalized;
    }

    private String normalizeDescription(String description) {
        if (description == null) {
            return null;
        }
        String normalized = description.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private BigDecimal safeMinOrder(BigDecimal minOrderValue) {
        return minOrderValue == null ? BigDecimal.ZERO : minOrderValue.max(BigDecimal.ZERO);
    }

    private int safeUsedCount(Integer usedCount) {
        return usedCount == null ? 0 : usedCount;
    }

    private VoucherResponse toResponse(Voucher voucher) {
        Voucher.VoucherStatus displayStatus = resolveDisplayStatus(voucher);
        String storeName = storeRepository.findById(voucher.getStoreId())
                .map(Store::getName)
                .orElse(null);
        return VoucherResponse.builder()
                .id(voucher.getId())
                .storeId(voucher.getStoreId())
                .storeName(storeName)
                .name(voucher.getName())
                .code(voucher.getCode())
                .description(voucher.getDescription())
                .discountType(voucher.getDiscountType())
                .discountValue(voucher.getDiscountValue())
                .minOrderValue(voucher.getMinOrderValue())
                .totalIssued(voucher.getTotalIssued())
                .usedCount(voucher.getUsedCount())
                .status(displayStatus)
                .startDate(voucher.getStartDate())
                .endDate(voucher.getEndDate())
                .createdAt(voucher.getCreatedAt())
                .updatedAt(voucher.getUpdatedAt())
                .build();
    }

    private Voucher.VoucherStatus resolveDisplayStatus(Voucher voucher) {
        if (voucher.getStatus() != Voucher.VoucherStatus.RUNNING) {
            return voucher.getStatus();
        }

        LocalDate today = LocalDate.now();
        if (voucher.getEndDate() != null && voucher.getEndDate().isBefore(today)) {
            return Voucher.VoucherStatus.PAUSED;
        }
        return Voucher.VoucherStatus.RUNNING;
    }
}
