package vn.edu.hcmuaf.fit.marketplace.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmuaf.fit.marketplace.dto.request.CartItemRequest;
import vn.edu.hcmuaf.fit.marketplace.entity.Cart;
import vn.edu.hcmuaf.fit.marketplace.security.JwtService;
import vn.edu.hcmuaf.fit.marketplace.service.CartService;

import java.util.UUID;

@RestController
@RequestMapping("/api/cart")
public class CartController {

    private final CartService cartService;
    private final JwtService jwtService;

    public CartController(CartService cartService, JwtService jwtService) {
        this.cartService = cartService;
        this.jwtService = jwtService;
    }

    @GetMapping
    public ResponseEntity<Cart> getCart(@RequestHeader("Authorization") String authHeader) {
        String userIdStr = jwtService.extractUserId(authHeader.replace("Bearer ", ""));
        UUID userId = UUID.fromString(userIdStr);
        return ResponseEntity.ok(cartService.getCartByUserId(userId));
    }

    @PostMapping("/items")
    public ResponseEntity<Cart> addItem(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody CartItemRequest request) {
        String userIdStr = jwtService.extractUserId(authHeader.replace("Bearer ", ""));
        UUID userId = UUID.fromString(userIdStr);
        return ResponseEntity.ok(cartService.addItem(userId, request));
    }

    @PutMapping("/items/{itemId}")
    public ResponseEntity<Cart> updateItem(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID itemId,
            @RequestParam Integer quantity) {
        String userIdStr = jwtService.extractUserId(authHeader.replace("Bearer ", ""));
        UUID userId = UUID.fromString(userIdStr);
        return ResponseEntity.ok(cartService.updateItemQuantity(userId, itemId, quantity));
    }

    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<Cart> removeItem(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID itemId) {
        String userIdStr = jwtService.extractUserId(authHeader.replace("Bearer ", ""));
        UUID userId = UUID.fromString(userIdStr);
        return ResponseEntity.ok(cartService.removeItem(userId, itemId));
    }

    @DeleteMapping
    public ResponseEntity<Void> clearCart(@RequestHeader("Authorization") String authHeader) {
        String userIdStr = jwtService.extractUserId(authHeader.replace("Bearer ", ""));
        UUID userId = UUID.fromString(userIdStr);
        cartService.clearCart(userId);
        return ResponseEntity.noContent().build();
    }
}
