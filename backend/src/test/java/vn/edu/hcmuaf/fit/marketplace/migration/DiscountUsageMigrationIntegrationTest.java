package vn.edu.hcmuaf.fit.marketplace.migration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.util.StreamUtils;
import vn.edu.hcmuaf.fit.marketplace.entity.Address;
import vn.edu.hcmuaf.fit.marketplace.entity.Coupon;
import vn.edu.hcmuaf.fit.marketplace.entity.Order;
import vn.edu.hcmuaf.fit.marketplace.entity.User;
import vn.edu.hcmuaf.fit.marketplace.repository.AddressRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.CouponRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.OrderRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.UserRepository;

import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class DiscountUsageMigrationIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private CouponRepository couponRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AddressRepository addressRepository;

    @Test
    void reconcileAndBackfillLegacyDiscountUsageConsumedData() throws Exception {
        boolean hasFlywayHistory = Boolean.TRUE.equals(jdbcTemplate.queryForObject(
                "SELECT to_regclass('flyway_schema_history') IS NOT NULL",
                Boolean.class
        ));
        LocalDateTime cutoff = LocalDateTime.now();
        if (hasFlywayHistory) {
            LocalDateTime installedOn = jdbcTemplate.queryForObject(
                    """
                            SELECT installed_on
                            FROM flyway_schema_history
                            WHERE script = 'V20260407_01__add_order_discount_usage_consumed_flag.sql'
                              AND success = TRUE
                            ORDER BY installed_rank DESC
                            LIMIT 1
                            """,
                    LocalDateTime.class
            );
            if (installedOn != null) {
                cutoff = installedOn;
            }
        }

        User user = userRepository.save(User.builder()
                .email("migration-test-" + UUID.randomUUID() + "@local")
                .password("secret")
                .name("Migration Test")
                .role(User.Role.CUSTOMER)
                .build());
        Address address = addressRepository.save(Address.builder()
                .user(user)
                .fullName("Migration Test")
                .phone("0900000000")
                .province("HCM")
                .district("Q1")
                .ward("Ben Nghe")
                .detail("1 Test Street")
                .isDefault(true)
                .build());

        String couponCodeA = "MIGRC" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        String couponCodeB = "MIGRC" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();

        Coupon couponA = couponRepository.save(Coupon.builder()
                .code(couponCodeA)
                .description("Coupon A")
                .discountType(Coupon.DiscountType.FIXED)
                .discountValue(10.0)
                .minOrderAmount(0.0)
                .maxUses(100)
                .usedCount(2)
                .isActive(true)
                .build());
        Coupon couponB = couponRepository.save(Coupon.builder()
                .code(couponCodeB)
                .description("Coupon B")
                .discountType(Coupon.DiscountType.FIXED)
                .discountValue(10.0)
                .minOrderAmount(0.0)
                .maxUses(100)
                .usedCount(0)
                .isActive(true)
                .build());

        Order legacyConsumedTrue = saveRootDiscountedOrder(user, address, couponCodeA, true);
        Order legacyConsumedFalse = saveRootDiscountedOrder(user, address, couponCodeA, false);
        Order nonLegacy = saveRootDiscountedOrder(user, address, couponCodeA, false);
        Order clampedOrder = saveRootDiscountedOrder(user, address, couponCodeB, true);

        jdbcTemplate.update(
                "UPDATE orders SET created_at = ? WHERE id = ?",
                Timestamp.valueOf(cutoff.minusDays(1)),
                legacyConsumedTrue.getId()
        );
        jdbcTemplate.update(
                "UPDATE orders SET created_at = ? WHERE id = ?",
                Timestamp.valueOf(cutoff.minusDays(1)),
                legacyConsumedFalse.getId()
        );
        jdbcTemplate.update(
                "UPDATE orders SET created_at = ? WHERE id = ?",
                Timestamp.valueOf(cutoff.minusDays(1)),
                clampedOrder.getId()
        );
        jdbcTemplate.update(
                "UPDATE orders SET created_at = ? WHERE id = ?",
                Timestamp.valueOf(cutoff.plusDays(1)),
                nonLegacy.getId()
        );

        String migrationSql = StreamUtils.copyToString(
                new ClassPathResource("db/migration/V20260407_03__reconcile_discount_usage_consumed_legacy.sql").getInputStream(),
                StandardCharsets.UTF_8
        );
        jdbcTemplate.execute(migrationSql);

        Coupon reloadedCouponA = couponRepository.findById(couponA.getId()).orElseThrow();
        Coupon reloadedCouponB = couponRepository.findById(couponB.getId()).orElseThrow();
        Order reloadedLegacyConsumedTrue = orderRepository.findById(legacyConsumedTrue.getId()).orElseThrow();
        Order reloadedLegacyConsumedFalse = orderRepository.findById(legacyConsumedFalse.getId()).orElseThrow();
        Order reloadedNonLegacy = orderRepository.findById(nonLegacy.getId()).orElseThrow();
        Order reloadedClamped = orderRepository.findById(clampedOrder.getId()).orElseThrow();

        assertEquals(1, reloadedCouponA.getUsedCount());
        assertEquals(0, reloadedCouponB.getUsedCount());
        assertTrue(Boolean.TRUE.equals(reloadedLegacyConsumedTrue.getDiscountUsageConsumed()));
        assertTrue(Boolean.TRUE.equals(reloadedLegacyConsumedFalse.getDiscountUsageConsumed()));
        assertTrue(Boolean.TRUE.equals(reloadedClamped.getDiscountUsageConsumed()));
        assertFalse(Boolean.TRUE.equals(reloadedNonLegacy.getDiscountUsageConsumed()));
    }

    private Order saveRootDiscountedOrder(User user, Address address, String couponCode, boolean consumed) {
        Order order = Order.builder()
                .orderCode("ORD-MIGR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .user(user)
                .shippingAddress(address)
                .status(Order.OrderStatus.PENDING)
                .paymentMethod(Order.PaymentMethod.VNPAY)
                .paymentStatus(Order.PaymentStatus.UNPAID)
                .subtotal(new java.math.BigDecimal("100.00"))
                .shippingFee(java.math.BigDecimal.ZERO)
                .discount(new java.math.BigDecimal("10.00"))
                .total(new java.math.BigDecimal("90.00"))
                .couponCode(couponCode)
                .discountUsageConsumed(consumed)
                .build();
        return orderRepository.save(order);
    }
}
