package vn.edu.hcmuaf.fit.marketplace.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import vn.edu.hcmuaf.fit.marketplace.dto.response.StoreFollowResponse;
import vn.edu.hcmuaf.fit.marketplace.entity.Store;
import vn.edu.hcmuaf.fit.marketplace.entity.StoreFollow;
import vn.edu.hcmuaf.fit.marketplace.entity.User;
import vn.edu.hcmuaf.fit.marketplace.repository.StoreFollowRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.StoreRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.UserRepository;

import java.util.UUID;

@Service
public class StoreFollowService {

    private final StoreRepository storeRepository;
    private final UserRepository userRepository;
    private final StoreFollowRepository storeFollowRepository;

    public StoreFollowService(
            StoreRepository storeRepository,
            UserRepository userRepository,
            StoreFollowRepository storeFollowRepository
    ) {
        this.storeRepository = storeRepository;
        this.userRepository = userRepository;
        this.storeFollowRepository = storeFollowRepository;
    }

    @Transactional(readOnly = true)
    public StoreFollowResponse getFollowState(UUID storeId, UUID userId) {
        ensurePublicStore(storeId);

        long followerCount = storeFollowRepository.countByStoreId(storeId);
        boolean followedByCurrentUser = userId != null && storeFollowRepository.existsByUserIdAndStoreId(userId, storeId);

        return StoreFollowResponse.builder()
                .storeId(storeId)
                .followerCount(followerCount)
                .followedByCurrentUser(followedByCurrentUser)
                .build();
    }

    @Transactional
    public StoreFollowResponse follow(UUID storeId, UUID userId) {
        Store store = ensurePublicStore(storeId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (store.getOwner() != null && userId.equals(store.getOwner().getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Store owner cannot follow own store");
        }

        boolean alreadyFollowed = storeFollowRepository.existsByUserIdAndStoreId(userId, storeId);
        if (!alreadyFollowed) {
            StoreFollow follow = StoreFollow.builder()
                    .user(user)
                    .store(store)
                    .build();
            storeFollowRepository.save(follow);
        }

        return getFollowState(storeId, userId);
    }

    @Transactional
    public StoreFollowResponse unfollow(UUID storeId, UUID userId) {
        ensurePublicStore(storeId);
        storeFollowRepository.deleteByUserIdAndStoreId(userId, storeId);
        return getFollowState(storeId, userId);
    }

    private Store ensurePublicStore(UUID storeId) {
        return storeRepository.findByIdAndApprovalStatusAndStatus(
                        storeId,
                        Store.ApprovalStatus.APPROVED,
                        Store.StoreStatus.ACTIVE
                )
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Store not found"));
    }
}

