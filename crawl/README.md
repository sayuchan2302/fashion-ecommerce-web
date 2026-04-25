# GAP Crawl Script (Student/Internal Demo)

Script: `crawl/crawl-gap-products.mjs`

Mục tiêu:
- Crawl dữ liệu product public từ `gap.com`
- Export ra format CSV tương thích importer backend:
  - `styles.csv`
  - `images.csv`
  - `products.raw.json`

Lưu ý:
- Chỉ dùng cho học tập nội bộ.
- Không bypass captcha / anti-bot / login.
- Crawl chậm (có delay) để giảm tải.

## 1) Cài dependency

```bash
npm install --save-dev playwright
npx playwright install chromium
```

## 2) Chạy crawl (full config dự án)

```bash
node crawl/crawl-gap-products.mjs --target-count 1000 --max-colors 4 --max-sizes 6 --max-per-category 120 --output-dir backend/src/main/resources/product
```

## 3) Output mặc định

- `backend/src/main/resources/product/styles.csv`
- `backend/src/main/resources/product/images.csv`
- `backend/src/main/resources/product/products.raw.json`

## 4) Mapping dữ liệu

`styles.csv`:
- `id`: lấy từ query param `pid` của URL product
- `gender`, `masterCategory`, `subCategory`, `articleType`, `usage`: từ config category + suy luận từ breadcrumb/name
- `baseColour`: màu đang chọn trên PDP
- `colorOptions`: tối đa 4 màu / product
- `colorHexOptions`: map `Tên màu=#hex` nếu đọc được từ swatch
- `sizeOptions`: tối đa 6 size / product (size dạng `28W` được chuẩn hóa thành `28`)
- `season`: mặc định `All`
- `year`: năm hiện tại
- `productDisplayName`: title PDP
- `productDetails`: dữ liệu từ section `Product details` (inline bằng `|`)
- `sizeFitDetails`: dữ liệu từ section `Size & fit` (inline bằng `|`)
- `fabricDetails`: phần chất liệu tách từ `Fabric & care` (inline bằng `|`)
- `careDetails`: phần hướng dẫn bảo quản tách từ `Fabric & care` (inline bằng `|`)

`images.csv`:
- `id`: product id (`pid`)
- `filename`: `${id}.jpg` (giữ format importer cũ)
- `sortOrder`: thứ tự ảnh (0..5)
- `link`: URL ảnh trong gallery PDP
- tối đa 6 ảnh / product

## 5) Import vào backend

Cập nhật `backend/.env` hoặc `application.yml`:
- `APP_SEED_GAP_STYLES_PATH=backend/src/main/resources/product/styles.csv`
- `APP_SEED_GAP_IMAGES_PATH=backend/src/main/resources/product/images.csv`

Rồi restart backend để chạy GAP importer.
