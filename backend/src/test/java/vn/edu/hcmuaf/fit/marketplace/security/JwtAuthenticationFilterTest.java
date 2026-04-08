package vn.edu.hcmuaf.fit.marketplace.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import vn.edu.hcmuaf.fit.marketplace.entity.User.Role;
import vn.edu.hcmuaf.fit.marketplace.repository.UserRepository;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class JwtAuthenticationFilterTest {

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void setsAuthenticationForEnabledUser() throws Exception {
        UserDetails enabledUser = User.withUsername("enabled@test.local")
                .password("hashed")
                .authorities("ROLE_CUSTOMER")
                .disabled(false)
                .build();

        UUID userId = UUID.randomUUID();
        vn.edu.hcmuaf.fit.marketplace.entity.User account = new vn.edu.hcmuaf.fit.marketplace.entity.User();
        account.setId(userId);
        account.setEmail("enabled@test.local");
        account.setRole(Role.CUSTOMER);

        UserRepository userRepository = mock(UserRepository.class);
        when(userRepository.findByEmail("enabled@test.local")).thenReturn(Optional.of(account));

        JwtService jwtService = new StubJwtService("enabled@test.local", userId.toString(), "CUSTOMER", true);
        UserDetailsService userDetailsService = username -> enabledUser;
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwtService, userDetailsService, userRepository);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer valid-token");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertNotNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void doesNotSetAuthenticationForDisabledUser() throws Exception {
        UserDetails disabledUser = User.withUsername("disabled@test.local")
                .password("hashed")
                .authorities("ROLE_CUSTOMER")
                .disabled(true)
                .build();

        UUID userId = UUID.randomUUID();
        vn.edu.hcmuaf.fit.marketplace.entity.User account = new vn.edu.hcmuaf.fit.marketplace.entity.User();
        account.setId(userId);
        account.setEmail("disabled@test.local");
        account.setRole(Role.CUSTOMER);

        UserRepository userRepository = mock(UserRepository.class);
        when(userRepository.findByEmail("disabled@test.local")).thenReturn(Optional.of(account));

        JwtService jwtService = new StubJwtService("disabled@test.local", userId.toString(), "CUSTOMER", true);
        UserDetailsService userDetailsService = username -> disabledUser;
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwtService, userDetailsService, userRepository);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer disabled-token");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    private static final class StubJwtService extends JwtService {
        private final String username;
        private final String userId;
        private final String role;
        private final boolean valid;

        private StubJwtService(String username, String userId, String role, boolean valid) {
            this.username = username;
            this.userId = userId;
            this.role = role;
            this.valid = valid;
        }

        @Override
        public String extractUsername(String token) {
            return username;
        }

        @Override
        public String extractUserId(String token) {
            return userId;
        }

        @Override
        public String extractRole(String token) {
            return role;
        }

        @Override
        public boolean isTokenValid(String token, UserDetails userDetails) {
            return valid;
        }
    }
}
