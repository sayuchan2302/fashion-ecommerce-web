package vn.edu.hcmuaf.fit.marketplace.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmuaf.fit.marketplace.dto.request.AddressRequest;
import vn.edu.hcmuaf.fit.marketplace.entity.Address;
import vn.edu.hcmuaf.fit.marketplace.security.JwtService;
import vn.edu.hcmuaf.fit.marketplace.service.AddressService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/addresses")
public class AddressController {

    private final AddressService addressService;
    private final JwtService jwtService;

    public AddressController(AddressService addressService, JwtService jwtService) {
        this.addressService = addressService;
        this.jwtService = jwtService;
    }

    @GetMapping
    public ResponseEntity<List<Address>> getAddresses(@RequestHeader("Authorization") String authHeader) {
        UUID userId = UUID.fromString(jwtService.extractUserId(authHeader.replace("Bearer ", "")));
        return ResponseEntity.ok(addressService.findByUserId(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Address> getAddressById(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID id) {
        return ResponseEntity.ok(addressService.findById(id));
    }

    @PostMapping
    public ResponseEntity<Address> create(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody AddressRequest request) {
        UUID userId = UUID.fromString(jwtService.extractUserId(authHeader.replace("Bearer ", "")));
        return ResponseEntity.ok(addressService.create(userId, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Address> update(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID id,
            @RequestBody AddressRequest request) {
        UUID userId = UUID.fromString(jwtService.extractUserId(authHeader.replace("Bearer ", "")));
        return ResponseEntity.ok(addressService.update(id, userId, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(jwtService.extractUserId(authHeader.replace("Bearer ", "")));
        addressService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/default")
    public ResponseEntity<Address> setDefault(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID id) {
        UUID userId = UUID.fromString(jwtService.extractUserId(authHeader.replace("Bearer ", "")));
        return ResponseEntity.ok(addressService.setDefault(id, userId));
    }
}
