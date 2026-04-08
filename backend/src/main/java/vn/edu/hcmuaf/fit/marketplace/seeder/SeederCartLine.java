package vn.edu.hcmuaf.fit.marketplace.seeder;

import vn.edu.hcmuaf.fit.marketplace.entity.Product;
import vn.edu.hcmuaf.fit.marketplace.entity.ProductVariant;

public record SeederCartLine(Product product, ProductVariant variant, int quantity) {
}
