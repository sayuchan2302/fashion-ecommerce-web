package vn.edu.hcmuaf.fit.marketplace.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import vn.edu.hcmuaf.fit.marketplace.dto.response.CustomerVoucherListResponse;
import vn.edu.hcmuaf.fit.marketplace.dto.response.CustomerVoucherResponse;
import vn.edu.hcmuaf.fit.marketplace.entity.CustomerVoucher;
import vn.edu.hcmuaf.fit.marketplace.entity.Store;
import vn.edu.hcmuaf.fit.marketplace.entity.User;
import vn.edu.hcmuaf.fit.marketplace.entity.Voucher;
import vn.edu.hcmuaf.fit.marketplace.repository.CustomerVoucherRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.StoreFollowRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.StoreRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.UserRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.VoucherRepository;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Service
public class CustomerVoucherService {

    private final CustomerVoucherRepository customerVoucherRepository;
    private final VoucherRepository voucherRepository;
    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final StoreFollowRepository storeFollowRepository;

    public CustomerVoucherService(
            CustomerVoucherRepository customerVoucherRepository,
            VoucherRepository voucherRepository,
            UserRepository userRepository,
            StoreRepository storeRepository,
            StoreFollowRepository storeFollowRepository
    ) {
        this.customerVoucherRepository = customerVoucherRepository;
        this.voucherRepository = voucherRepository;
        this.userRepository = userRepository;
        this.storeRepository = storeRepository;
        this.storeFollowRepository = storeFollowRepository;
    }

    @Transactional(readOnly = true)
    public CustomerVoucherListResponse listMyWallet(
            UUID userId,
            CustomerVoucher.WalletStatus walletStatus,
            Pageable pageable
    ) {
        Page<CustomerVoucher> page = walletStatus == null
                ? customerVoucherRepository.findWalletByUserId(userId, pageable)
                : customerVoucherRepository.findWalletByUserIdAndStatus(userId, walletStatus, pageable);

        Map<UUID, String> storeNames = buildStoreNameMap(page.getContent());
        List<CustomerVoucherResponse> items = page.getContent().stream()
                .map(item -> toResponse(item, storeNames))
                .toList();

        return CustomerVoucherListResponse.builder()
                .items(items)
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .page(pageable.getPageNumber() + 1)
                .pageSize(pageable.getPageSize())
                .build();
    }

    @Transactional
    public CustomerVoucherResponse claimVoucher(UUID userId, UUID voucherId) {
        User user = getActiveCustomer(userId);
        Voucher voucher = voucherRepository.findById(voucherId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Voucher not found"));

        if (!isVoucherPubliclyAvailable(voucher, LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Voucher is not available for claim");
        }

        CustomerVoucher existing = customerVoucherRepository.findByUserIdAndVoucherId(userId, voucherId).orElse(null);
        if (existing != null) {
            return toResponse(existing, Map.of(voucher.getStoreId(), resolveStoreName(voucher.getStoreId())));
        }

        CustomerVoucher created = customerVoucherRepository.save(CustomerVoucher.builder()
                .user(user)
                .voucher(voucher)
                .walletStatus(CustomerVoucher.WalletStatus.AVAILABLE)
                .claimSource(CustomerVoucher.ClaimSource.STORE_CLAIM)
                .build());

        return toResponse(created, Map.of(voucher.getStoreId(), resolveStoreName(voucher.getStoreId())));
    }

    @Transactional
    public int assignVoucherToAllActiveCustomers(Voucher voucher) {
        if (!isVoucherPubliclyAvailable(voucher, LocalDate.now())) {
            return 0;
        }
        List<UUID> customerIds = userRepository.findIdsByRoleAndIsActiveTrue(User.Role.CUSTOMER);
        return assignVoucherToUsers(voucher, customerIds, CustomerVoucher.ClaimSource.ADMIN_AUTO);
    }

    @Transactional
    public int assignVoucherToStoreFollowers(Voucher voucher) {
        if (voucher == null || voucher.getStoreId() == null) {
            return 0;
        }
        if (!isVoucherPubliclyAvailable(voucher, LocalDate.now())) {
            return 0;
        }

        List<UUID> followerIds = storeFollowRepository.findFollowerUserIdsByStoreIdAndRoleAndActive(
                voucher.getStoreId(),
                User.Role.CUSTOMER
        );
        return assignVoucherToUsers(voucher, followerIds, CustomerVoucher.ClaimSource.FOLLOW_AUTO);
    }

    @Transactional
    public int assignRunningVouchersToFollower(UUID storeId, UUID userId) {
        if (storeId == null || userId == null) {
            return 0;
        }

        User user = getActiveCustomer(userId);
        List<Voucher> runningVouchers = voucherRepository.findPublicAvailableByStoreIds(
                Voucher.VoucherStatus.RUNNING,
                List.of(storeId),
                LocalDate.now()
        );
        if (runningVouchers.isEmpty()) {
            return 0;
        }

        int assigned = 0;
        for (Voucher voucher : runningVouchers) {
            assigned += assignVoucherToUsers(voucher, List.of(user.getId()), CustomerVoucher.ClaimSource.FOLLOW_AUTO);
        }
        return assigned;
    }

    private int assignVoucherToUsers(
            Voucher voucher,
            Collection<UUID> recipientIds,
            CustomerVoucher.ClaimSource source
    ) {
        if (voucher == null || voucher.getId() == null || recipientIds == null || recipientIds.isEmpty()) {
            return 0;
        }

        List<UUID> normalizedIds = recipientIds.stream()
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (normalizedIds.isEmpty()) {
            return 0;
        }

        Set<UUID> alreadyAssigned = new HashSet<>(
                customerVoucherRepository.findAssignedUserIdsByVoucherIdAndUserIds(voucher.getId(), normalizedIds)
        );
        Map<UUID, User> usersById = new LinkedHashMap<>();
        for (User user : userRepository.findAllById(normalizedIds)) {
            if (user != null
                    && user.getRole() == User.Role.CUSTOMER
                    && Boolean.TRUE.equals(user.getIsActive())) {
                usersById.put(user.getId(), user);
            }
        }

        List<CustomerVoucher> toCreate = new ArrayList<>();
        for (UUID userId : normalizedIds) {
            if (alreadyAssigned.contains(userId)) {
                continue;
            }
            User user = usersById.get(userId);
            if (user == null) {
                continue;
            }
            toCreate.add(CustomerVoucher.builder()
                    .user(user)
                    .voucher(voucher)
                    .walletStatus(CustomerVoucher.WalletStatus.AVAILABLE)
                    .claimSource(source)
                    .build());
        }

        if (toCreate.isEmpty()) {
            return 0;
        }

        customerVoucherRepository.saveAll(toCreate);
        return toCreate.size();
    }

    private boolean isVoucherPubliclyAvailable(Voucher voucher, LocalDate today) {
        if (voucher == null || today == null) {
            return false;
        }
        if (voucher.getStatus() != Voucher.VoucherStatus.RUNNING) {
            return false;
        }
        if (voucher.getStartDate() != null && voucher.getStartDate().isAfter(today)) {
            return false;
        }
        if (voucher.getEndDate() != null && voucher.getEndDate().isBefore(today)) {
            return false;
        }
        int usedCount = voucher.getUsedCount() == null ? 0 : voucher.getUsedCount();
        int totalIssued = voucher.getTotalIssued() == null ? 0 : Math.max(voucher.getTotalIssued(), 0);
        return usedCount < totalIssued;
    }

    private User getActiveCustomer(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (user.getRole() != User.Role.CUSTOMER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only customer accounts can use voucher wallet");
        }
        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Inactive user cannot use voucher wallet");
        }
        return user;
    }

    private Map<UUID, String> buildStoreNameMap(List<CustomerVoucher> walletItems) {
        List<UUID> storeIds = walletItems.stream()
                .map(CustomerVoucher::getVoucher)
                .filter(Objects::nonNull)
                .map(Voucher::getStoreId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        if (storeIds.isEmpty()) {
            return Map.of();
        }

        Map<UUID, String> names = new LinkedHashMap<>();
        for (Store store : storeRepository.findAllById(storeIds)) {
            names.put(store.getId(), store.getName());
        }
        return names;
    }

    private String resolveStoreName(UUID storeId) {
        if (storeId == null) {
            return null;
        }
        return storeRepository.findById(storeId)
                .map(Store::getName)
                .orElse(null);
    }

    private CustomerVoucherResponse toResponse(CustomerVoucher walletItem, Map<UUID, String> storeNames) {
        Voucher voucher = walletItem.getVoucher();
        UUID storeId = voucher == null ? null : voucher.getStoreId();
        String storeName = storeId == null ? null : storeNames.getOrDefault(storeId, null);

        CustomerVoucherResponse.WalletDisplayStatus displayStatus = resolveDisplayStatus(walletItem, LocalDate.now());

        return CustomerVoucherResponse.builder()
                .id(walletItem.getId())
                .userId(walletItem.getUser() == null ? null : walletItem.getUser().getId())
                .voucherId(voucher == null ? null : voucher.getId())
                .storeId(storeId)
                .storeName(storeName)
                .name(voucher == null ? null : voucher.getName())
                .code(voucher == null ? null : voucher.getCode())
                .description(voucher == null ? null : voucher.getDescription())
                .discountType(voucher == null ? null : voucher.getDiscountType())
                .discountValue(voucher == null ? null : voucher.getDiscountValue())
                .minOrderValue(voucher == null ? null : voucher.getMinOrderValue())
                .totalIssued(voucher == null ? null : voucher.getTotalIssued())
                .usedCount(voucher == null ? null : voucher.getUsedCount())
                .voucherStatus(voucher == null ? null : voucher.getStatus())
                .startDate(voucher == null ? null : voucher.getStartDate())
                .endDate(voucher == null ? null : voucher.getEndDate())
                .walletStatus(walletItem.getWalletStatus())
                .displayStatus(displayStatus)
                .claimSource(walletItem.getClaimSource())
                .claimedAt(walletItem.getCreatedAt())
                .usedAt(walletItem.getUsedAt())
                .usedOrderId(walletItem.getUsedOrderId())
                .build();
    }

    private CustomerVoucherResponse.WalletDisplayStatus resolveDisplayStatus(CustomerVoucher walletItem, LocalDate today) {
        if (walletItem == null) {
            return CustomerVoucherResponse.WalletDisplayStatus.EXPIRED;
        }
        CustomerVoucher.WalletStatus walletStatus = walletItem.getWalletStatus();
        if (walletStatus == CustomerVoucher.WalletStatus.USED) {
            return CustomerVoucherResponse.WalletDisplayStatus.USED;
        }
        if (walletStatus == CustomerVoucher.WalletStatus.REVOKED) {
            return CustomerVoucherResponse.WalletDisplayStatus.REVOKED;
        }

        Voucher voucher = walletItem.getVoucher();
        if (!isVoucherPubliclyAvailable(voucher, today)) {
            return CustomerVoucherResponse.WalletDisplayStatus.EXPIRED;
        }
        return CustomerVoucherResponse.WalletDisplayStatus.AVAILABLE;
    }
}
