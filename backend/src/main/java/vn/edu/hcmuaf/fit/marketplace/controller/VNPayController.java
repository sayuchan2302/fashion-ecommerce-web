package vn.edu.hcmuaf.fit.marketplace.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.hcmuaf.fit.marketplace.dto.response.VNPayCreatePayUrlResponse;
import vn.edu.hcmuaf.fit.marketplace.dto.response.VNPayReturnVerifyResponse;
import vn.edu.hcmuaf.fit.marketplace.entity.Order;
import vn.edu.hcmuaf.fit.marketplace.security.AuthContext;
import vn.edu.hcmuaf.fit.marketplace.service.OrderService;
import vn.edu.hcmuaf.fit.marketplace.service.VNPayService;

import java.util.Map;

@RestController
@RequestMapping("/api/payments/vnpay")
public class VNPayController {

    private final AuthContext authContext;
    private final OrderService orderService;
    private final VNPayService vnPayService;

    public VNPayController(AuthContext authContext, OrderService orderService, VNPayService vnPayService) {
        this.authContext = authContext;
        this.orderService = orderService;
        this.vnPayService = vnPayService;
    }

    @PostMapping("/orders/{orderCode}/pay-url")
    public ResponseEntity<VNPayCreatePayUrlResponse> createPayUrl(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String orderCode,
            HttpServletRequest request
    ) {
        AuthContext.UserContext user = authContext.fromAuthHeader(authHeader);
        Order order = orderService.findByCodeForUser(orderCode, user.getUserId());
        String clientIp = resolveClientIp(request);
        return ResponseEntity.ok(vnPayService.createPaymentUrl(order, clientIp));
    }

    @GetMapping("/return/verify")
    public ResponseEntity<VNPayReturnVerifyResponse> verifyReturn(@RequestParam Map<String, String> queryParams) {
        return ResponseEntity.ok(vnPayService.verifyReturn(queryParams));
    }

    @GetMapping("/ipn")
    public ResponseEntity<VNPayService.VNPayIpnResponse> ipn(@RequestParam Map<String, String> queryParams) {
        return ResponseEntity.ok(vnPayService.processIpn(queryParams));
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }
}
