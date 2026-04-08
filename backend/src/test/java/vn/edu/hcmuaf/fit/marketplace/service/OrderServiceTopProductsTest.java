package vn.edu.hcmuaf.fit.marketplace.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import vn.edu.hcmuaf.fit.marketplace.dto.response.VendorTopProductResponse;
import vn.edu.hcmuaf.fit.marketplace.repository.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderServiceTopProductsTest {

    @Mock
    private OrderRepository orderRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AddressRepository addressRepository;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private ProductVariantRepository productVariantRepository;
    @Mock
    private StoreRepository storeRepository;
    @Mock
    private CouponRepository couponRepository;
    @Mock
    private VoucherRepository voucherRepository;

    @InjectMocks
    private OrderService orderService;

    @Test
    void getTopProductsByStoreReturnsMappedRows() {
        UUID storeId = UUID.randomUUID();
        UUID productId = UUID.randomUUID();
        OrderRepository.ProductSalesProjection row = projection(
                productId,
                "Ao Polo",
                "https://cdn.example/polo.jpg",
                12L,
                new BigDecimal("3600000")
        );

        when(orderRepository.findTopDeliveredProductsByStoreBetween(
                eq(storeId),
                any(),
                any(),
                eq(PageRequest.of(0, 5))
        )).thenReturn(List.of(row));

        List<VendorTopProductResponse> result = orderService.getTopProductsByStore(storeId, 7, 5);

        assertEquals(1, result.size());
        assertEquals(productId, result.get(0).getProductId());
        assertEquals("Ao Polo", result.get(0).getProductName());
        assertEquals(12L, result.get(0).getSoldCount());
        assertEquals(new BigDecimal("3600000"), result.get(0).getGrossRevenue());
        verify(orderRepository).findTopDeliveredProductsByStoreBetween(
                eq(storeId),
                any(),
                any(),
                eq(PageRequest.of(0, 5))
        );
    }

    @Test
    void getTopProductsByStoreRejectsUnsupportedDays() {
        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> orderService.getTopProductsByStore(UUID.randomUUID(), 14, 5)
        );

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    void getTopProductsByStoreRejectsInvalidLimit() {
        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> orderService.getTopProductsByStore(UUID.randomUUID(), 7, 21)
        );

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    private static OrderRepository.ProductSalesProjection projection(
            UUID productId,
            String productName,
            String productImage,
            Long soldCount,
            BigDecimal grossRevenue
    ) {
        return new OrderRepository.ProductSalesProjection() {
            @Override
            public UUID getProductId() {
                return productId;
            }

            @Override
            public String getProductName() {
                return productName;
            }

            @Override
            public String getProductImage() {
                return productImage;
            }

            @Override
            public Long getSoldCount() {
                return soldCount;
            }

            @Override
            public BigDecimal getGrossRevenue() {
                return grossRevenue;
            }
        };
    }
}
