package vn.edu.hcmuaf.fit.marketplace.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.edu.hcmuaf.fit.marketplace.dto.request.StoreRequest;
import vn.edu.hcmuaf.fit.marketplace.entity.Store;
import vn.edu.hcmuaf.fit.marketplace.entity.User;
import vn.edu.hcmuaf.fit.marketplace.repository.ProductRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.ReviewRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.StoreRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.UserRepository;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StoreServiceBankVerificationTest {

    @Mock private StoreRepository storeRepository;
    @Mock private UserRepository userRepository;
    @Mock private ProductRepository productRepository;
    @Mock private ReviewRepository reviewRepository;

    private StoreService storeService;

    @BeforeEach
    void setUp() {
        storeService = new StoreService(
                storeRepository,
                userRepository,
                productRepository,
                reviewRepository
        );
    }

    @Test
    void vendorUpdateStoreIgnoresBankVerifiedField() {
        UUID userId = UUID.randomUUID();
        User owner = User.builder()
                .id(userId)
                .email("vendor@example.com")
                .password("hashed")
                .name("Vendor")
                .role(User.Role.VENDOR)
                .build();
        Store store = Store.builder()
                .id(UUID.randomUUID())
                .owner(owner)
                .name("Store")
                .slug("store")
                .bankVerified(false)
                .status(Store.StoreStatus.ACTIVE)
                .approvalStatus(Store.ApprovalStatus.APPROVED)
                .build();

        when(storeRepository.findByOwnerId(userId)).thenReturn(Optional.of(store));
        when(storeRepository.save(any(Store.class))).thenAnswer(inv -> inv.getArgument(0));

        StoreRequest request = StoreRequest.builder()
                .bankVerified(true)
                .description("updated")
                .build();

        storeService.updateStore(userId, request);

        assertFalse(Boolean.TRUE.equals(store.getBankVerified()));
    }

    @Test
    void adminUpdateBankVerificationUpdatesFlag() {
        UUID storeId = UUID.randomUUID();
        User owner = User.builder()
                .id(UUID.randomUUID())
                .email("vendor@example.com")
                .password("hashed")
                .name("Vendor")
                .role(User.Role.VENDOR)
                .build();
        Store store = Store.builder()
                .id(storeId)
                .owner(owner)
                .name("Store")
                .slug("store")
                .bankVerified(false)
                .status(Store.StoreStatus.ACTIVE)
                .approvalStatus(Store.ApprovalStatus.APPROVED)
                .build();

        when(storeRepository.findById(storeId)).thenReturn(Optional.of(store));
        when(storeRepository.save(any(Store.class))).thenAnswer(inv -> inv.getArgument(0));

        storeService.updateBankVerification(storeId, true, UUID.randomUUID(), "admin@example.com", "KYC approved");

        assertTrue(Boolean.TRUE.equals(store.getBankVerified()));
    }
}
