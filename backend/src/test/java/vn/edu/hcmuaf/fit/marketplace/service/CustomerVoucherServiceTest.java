package vn.edu.hcmuaf.fit.marketplace.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CustomerVoucherServiceTest {

    @Mock
    private CustomerVoucherRepository customerVoucherRepository;

    @Mock
    private VoucherRepository voucherRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private StoreRepository storeRepository;

    @Mock
    private StoreFollowRepository storeFollowRepository;

    private CustomerVoucherService customerVoucherService;

    @BeforeEach
    void setUp() {
        customerVoucherService = new CustomerVoucherService(
                customerVoucherRepository,
                voucherRepository,
                userRepository,
                storeRepository,
                storeFollowRepository
        );
    }

    @Test
    void claimVoucherCreatesWalletItemForActiveCustomer() {
        UUID userId = UUID.randomUUID();
        UUID voucherId = UUID.randomUUID();
        UUID storeId = UUID.randomUUID();

        User user = User.builder()
                .id(userId)
                .role(User.Role.CUSTOMER)
                .isActive(true)
                .build();
        Voucher voucher = Voucher.builder()
                .id(voucherId)
                .storeId(storeId)
                .name("Voucher 10")
                .code("V10")
                .discountType(Voucher.DiscountType.PERCENT)
                .discountValue(new BigDecimal("10"))
                .minOrderValue(BigDecimal.ZERO)
                .totalIssued(100)
                .usedCount(1)
                .status(Voucher.VoucherStatus.RUNNING)
                .startDate(LocalDate.now().minusDays(1))
                .endDate(LocalDate.now().plusDays(2))
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(voucherRepository.findById(voucherId)).thenReturn(Optional.of(voucher));
        when(customerVoucherRepository.findByUserIdAndVoucherId(userId, voucherId)).thenReturn(Optional.empty());
        when(storeRepository.findById(storeId)).thenReturn(Optional.of(Store.builder().id(storeId).name("Store A").build()));
        when(customerVoucherRepository.save(any(CustomerVoucher.class))).thenAnswer(invocation -> {
            CustomerVoucher created = invocation.getArgument(0);
            created.setId(UUID.randomUUID());
            return created;
        });

        CustomerVoucherResponse response = customerVoucherService.claimVoucher(userId, voucherId);

        assertNotNull(response.getId());
        assertEquals(voucherId, response.getVoucherId());
        assertEquals(CustomerVoucher.WalletStatus.AVAILABLE, response.getWalletStatus());
        assertEquals(CustomerVoucher.ClaimSource.STORE_CLAIM, response.getClaimSource());
        assertEquals("Store A", response.getStoreName());
    }

    @Test
    void claimVoucherRejectsInactiveVoucher() {
        UUID userId = UUID.randomUUID();
        UUID voucherId = UUID.randomUUID();

        User user = User.builder()
                .id(userId)
                .role(User.Role.CUSTOMER)
                .isActive(true)
                .build();
        Voucher voucher = Voucher.builder()
                .id(voucherId)
                .storeId(UUID.randomUUID())
                .status(Voucher.VoucherStatus.PAUSED)
                .totalIssued(10)
                .usedCount(0)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(voucherRepository.findById(voucherId)).thenReturn(Optional.of(voucher));

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> customerVoucherService.claimVoucher(userId, voucherId)
        );

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertEquals("Voucher is not available for claim", ex.getReason());
    }

    @Test
    void assignVoucherToStoreFollowersSkipsAlreadyAssignedUsers() {
        UUID voucherId = UUID.randomUUID();
        UUID storeId = UUID.randomUUID();
        UUID followerA = UUID.randomUUID();
        UUID followerB = UUID.randomUUID();

        Voucher voucher = Voucher.builder()
                .id(voucherId)
                .storeId(storeId)
                .status(Voucher.VoucherStatus.RUNNING)
                .totalIssued(100)
                .usedCount(1)
                .startDate(LocalDate.now().minusDays(1))
                .endDate(LocalDate.now().plusDays(3))
                .build();
        User userA = User.builder().id(followerA).role(User.Role.CUSTOMER).isActive(true).build();
        User userB = User.builder().id(followerB).role(User.Role.CUSTOMER).isActive(true).build();

        when(storeFollowRepository.findFollowerUserIdsByStoreIdAndRoleAndActive(storeId, User.Role.CUSTOMER))
                .thenReturn(List.of(followerA, followerB));
        when(customerVoucherRepository.findAssignedUserIdsByVoucherIdAndUserIds(eq(voucherId), anyCollection()))
                .thenReturn(List.of(followerB));
        when(userRepository.findAllById(anyCollection())).thenReturn(List.of(userA, userB));
        when(customerVoucherRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

        int assigned = customerVoucherService.assignVoucherToStoreFollowers(voucher);

        assertEquals(1, assigned);
        verify(customerVoucherRepository).saveAll(anyList());
    }

    @Test
    void listMyWalletReturnsPagedResponse() {
        UUID userId = UUID.randomUUID();
        UUID storeId = UUID.randomUUID();

        User user = User.builder().id(userId).role(User.Role.CUSTOMER).isActive(true).build();
        Voucher voucher = Voucher.builder()
                .id(UUID.randomUUID())
                .storeId(storeId)
                .code("WALLET")
                .name("Wallet")
                .discountType(Voucher.DiscountType.FIXED)
                .discountValue(new BigDecimal("20000"))
                .minOrderValue(BigDecimal.ZERO)
                .totalIssued(100)
                .usedCount(10)
                .status(Voucher.VoucherStatus.RUNNING)
                .startDate(LocalDate.now().minusDays(1))
                .endDate(LocalDate.now().plusDays(4))
                .build();
        CustomerVoucher wallet = CustomerVoucher.builder()
                .id(UUID.randomUUID())
                .user(user)
                .voucher(voucher)
                .walletStatus(CustomerVoucher.WalletStatus.AVAILABLE)
                .claimSource(CustomerVoucher.ClaimSource.ADMIN_AUTO)
                .build();

        when(customerVoucherRepository.findWalletByUserId(userId, PageRequest.of(0, 20)))
                .thenReturn(new PageImpl<>(List.of(wallet), PageRequest.of(0, 20), 1));
        when(storeRepository.findAllById(anyCollection()))
                .thenReturn(List.of(Store.builder().id(storeId).name("Store A").build()));

        CustomerVoucherListResponse response = customerVoucherService.listMyWallet(
                userId,
                null,
                PageRequest.of(0, 20)
        );

        assertEquals(1, response.getItems().size());
        assertEquals("Store A", response.getItems().get(0).getStoreName());
        assertEquals(1, response.getTotalElements());
    }
}
