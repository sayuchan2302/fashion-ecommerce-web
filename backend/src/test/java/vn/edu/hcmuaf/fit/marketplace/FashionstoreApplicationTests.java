package vn.edu.hcmuaf.fit.marketplace;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
		"app.seed.enabled=false",
		"app.seed.gap.enabled=false"
})
class FashionstoreApplicationTests {

	@Test
	void contextLoads() {
	}

}
