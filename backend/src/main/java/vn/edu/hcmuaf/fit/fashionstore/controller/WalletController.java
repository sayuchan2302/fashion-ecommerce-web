package vn.edu.hcmuaf.fit.fashionstore.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.hcmuaf.fit.fashionstore.dto.response.WalletResponse;
import vn.edu.hcmuaf.fit.fashionstore.dto.response.WalletTransactionResponse;
import vn.edu.hcmuaf.fit.fashionstore.entity.Store;
import vn.edu.hcmuaf.fit.fashionstore.entity.VendorWallet;
import vn.edu.hcmuaf.fit.fashionstore.entity.WalletTransaction;
import vn.edu.hcmuaf.fit.fashionstore.repository.StoreRepository;
import vn.edu.hcmuaf.fit.fashionstore.security.AuthContext;
import vn.edu.hcmuaf.fit.fashionstore.security.AuthContext.UserContext;
import vn.edu.hcmuaf.fit.fashionstore.service.WalletService;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/wallets")
public class WalletController {

    private final WalletService walletService;
    private final StoreRepository storeRepository;
    private final AuthContext authContext;

    public WalletController(WalletService walletService, StoreRepository storeRepository, AuthContext authContext) {
        this.walletService = walletService;
        this.storeRepository = storeRepository;
        this.authContext = authContext;
    }

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Page<WalletResponse>> getAllWallets(Pageable pageable) {
        List<VendorWallet> wallets = walletService.getAllWallets();
        List<WalletResponse> responses = wallets.stream().map(this::toResponse).toList();
        int start = (int) pageable.getOffset();
        if (start >= responses.size()) {
            return ResponseEntity.ok(new PageImpl<>(List.of(), pageable, responses.size()));
        }
        int end = Math.min(start + pageable.getPageSize(), responses.size());
        Page<WalletResponse> page = new PageImpl<>(responses.subList(start, end), pageable, responses.size());
        return ResponseEntity.ok(page);
    }

    @GetMapping("/my-wallet")
    @PreAuthorize("hasRole('VENDOR')")
    public ResponseEntity<WalletResponse> getMyWallet(@RequestHeader("Authorization") String authHeader) {
        UserContext ctx = authContext.requireVendor(authHeader);
        VendorWallet wallet = walletService.getWallet(ctx.getStoreId());
        return ResponseEntity.ok(toResponse(wallet));
    }

    @GetMapping("/my-wallet/transactions")
    @PreAuthorize("hasRole('VENDOR')")
    public ResponseEntity<Page<WalletTransactionResponse>> getMyTransactions(
            @RequestHeader("Authorization") String authHeader,
            Pageable pageable
    ) {
        UserContext ctx = authContext.requireVendor(authHeader);
        Page<WalletTransaction> transactions = walletService.getTransactions(ctx.getStoreId(), pageable);
        return ResponseEntity.ok(transactions.map(this::toResponse));
    }

    @GetMapping("/{storeId}/transactions")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Page<WalletTransactionResponse>> getStoreTransactions(
            @PathVariable UUID storeId,
            Pageable pageable
    ) {
        Page<WalletTransaction> transactions = walletService.getTransactions(storeId, pageable);
        return ResponseEntity.ok(transactions.map(this::toResponse));
    }

    @PostMapping("/{storeId}/withdraw")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<WalletTransactionResponse> withdraw(
            @PathVariable UUID storeId,
            @RequestBody(required = false) Map<String, Object> payload
    ) {
        BigDecimal amount = (payload != null && payload.get("amount") != null)
                ? new BigDecimal(payload.get("amount").toString())
                : walletService.getWallet(storeId).getBalance();
        String note = (payload != null && payload.get("note") != null)
                ? payload.get("note").toString()
                : "Giai ngan toan bo so du";

        WalletTransaction transaction = walletService.withdraw(storeId, amount, note);
        return ResponseEntity.ok(toResponse(transaction));
    }

    private WalletResponse toResponse(VendorWallet wallet) {
        Store store = storeRepository.findById(wallet.getStoreId()).orElse(null);
        String storeName = store != null ? store.getName() : "Unknown Store";
        String storeSlug = store != null ? store.getSlug() : null;

        return WalletResponse.builder()
                .id(wallet.getId())
                .storeId(wallet.getStoreId())
                .storeName(storeName)
                .storeSlug(storeSlug)
                .balance(wallet.getBalance())
                .lastUpdated(wallet.getLastUpdated())
                .build();
    }

    private WalletTransactionResponse toResponse(WalletTransaction transaction) {
        return WalletTransactionResponse.builder()
                .id(transaction.getId())
                .code(transaction.getTransactionCode())
                .walletId(transaction.getWallet().getId())
                .orderId(transaction.getOrderId())
                .amount(transaction.getAmount())
                .type(transaction.getType())
                .description(transaction.getDescription())
                .createdAt(transaction.getCreatedAt())
                .build();
    }
}
