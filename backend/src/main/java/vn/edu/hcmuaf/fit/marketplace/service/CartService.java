package vn.edu.hcmuaf.fit.marketplace.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmuaf.fit.marketplace.dto.request.CartItemRequest;
import vn.edu.hcmuaf.fit.marketplace.entity.Cart;
import vn.edu.hcmuaf.fit.marketplace.entity.CartItem;
import vn.edu.hcmuaf.fit.marketplace.entity.Product;
import vn.edu.hcmuaf.fit.marketplace.entity.ProductVariant;
import vn.edu.hcmuaf.fit.marketplace.entity.User;
import vn.edu.hcmuaf.fit.marketplace.exception.ResourceNotFoundException;
import vn.edu.hcmuaf.fit.marketplace.repository.CartRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.ProductRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.ProductVariantRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.UserRepository;

import java.math.BigDecimal;
import java.util.UUID;

@Service
public class CartService {

    private final CartRepository cartRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;

    public CartService(CartRepository cartRepository, UserRepository userRepository, 
                       ProductRepository productRepository, ProductVariantRepository productVariantRepository) {
        this.cartRepository = cartRepository;
        this.userRepository = userRepository;
        this.productRepository = productRepository;
        this.productVariantRepository = productVariantRepository;
    }

    public Cart getCartByUserId(UUID userId) {
        return cartRepository.findByUserIdWithItems(userId)
                .orElseGet(() -> createCartForUser(userId));
    }

    private Cart createCartForUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        Cart cart = Cart.builder()
                .user(user)
                .totalAmount(BigDecimal.ZERO)
                .build();
        
        return cartRepository.save(cart);
    }

    @Transactional
    public Cart addItem(UUID userId, CartItemRequest request) {
        Cart cart = getCartByUserId(userId);
        
        Product product = productRepository.findPublicById(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        
        final ProductVariant variant;
        if (request.getVariantId() != null) {
            variant = productVariantRepository.findById(request.getVariantId())
                    .filter(found -> found.getProduct().getId().equals(product.getId()))
                    .filter(found -> Boolean.TRUE.equals(found.getIsActive()))
                    .orElseThrow(() -> new ResourceNotFoundException("Variant not found"));
        } else {
            variant = null;
        }
        
        final ProductVariant finalVariant = variant;
        // Check if item already exists in cart
        CartItem existingItem = cart.getItems().stream()
                .filter(item -> item.getProduct().getId().equals(product.getId()))
                .filter(item -> (finalVariant == null && item.getVariant() == null) || 
                        (finalVariant != null && finalVariant.equals(item.getVariant())))
                .findFirst()
                .orElse(null);
        
        if (existingItem != null) {
            // Update quantity
            existingItem.setQuantity(existingItem.getQuantity() + request.getQuantity());
            existingItem.setUnitPrice(finalVariant != null ? finalVariant.getPrice() : product.getEffectivePrice());
        } else {
            // Add new item
            CartItem newItem = CartItem.builder()
                    .cart(cart)
                    .product(product)
                    .variant(finalVariant)
                    .quantity(request.getQuantity())
                    .unitPrice(finalVariant != null ? finalVariant.getPrice() : product.getEffectivePrice())
                    .build();
            cart.getItems().add(newItem);
        }
        
        cart.calculateTotal();
        return cartRepository.save(cart);
    }

    @Transactional
    public Cart updateItemQuantity(UUID userId, UUID itemId, Integer quantity) {
        Cart cart = getCartByUserId(userId);
        
        CartItem item = cart.getItems().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Cart item not found"));
        
        if (quantity <= 0) {
            cart.getItems().remove(item);
        } else {
            item.setQuantity(quantity);
        }
        
        cart.calculateTotal();
        return cartRepository.save(cart);
    }

    @Transactional
    public Cart removeItem(UUID userId, UUID itemId) {
        Cart cart = getCartByUserId(userId);
        
        cart.getItems().removeIf(item -> item.getId().equals(itemId));
        cart.calculateTotal();
        
        return cartRepository.save(cart);
    }

    @Transactional
    public void clearCart(UUID userId) {
        Cart cart = getCartByUserId(userId);
        cart.getItems().clear();
        cart.setTotalAmount(BigDecimal.ZERO);
        cartRepository.save(cart);
    }
}
