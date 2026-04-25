export const CLIENT_TOAST_MESSAGES = {
  auth: {
    logoutSuccess: 'Đã đăng xuất',
    loginSuccess: 'Đăng nhập thành công',
    registerSuccess: 'Tạo tài khoản thành công',
    loginFailed: 'Đăng nhập thất bại',
    registerFailed: 'Đăng ký thất bại',
    resetPasswordSuccess: 'Đặt lại mật khẩu thành công',
    resetPasswordFailed: 'Đặt lại mật khẩu thất bại',
    sendResetEmailSuccess: 'Đã gửi hướng dẫn đặt lại mật khẩu',
    sendResetEmailFailed: 'Gửi yêu cầu thất bại',
    updatePasswordSuccess: 'Đã cập nhật mật khẩu',
    updateProfileSuccess: 'Đã cập nhật thông tin tài khoản',
  },
  cart: {
    added: 'Đã thêm sản phẩm vào giỏ',
    updated: 'Đã cập nhật số lượng sản phẩm trong giỏ',
    removed: 'Đã xoá sản phẩm khỏi giỏ',
  },
  wishlist: {
    added: 'Đã thêm vào danh sách yêu thích',
    removed: 'Đã xoá khỏi danh sách yêu thích',
  },
  order: {
    cancelled: 'Đã hủy đơn hàng thành công',
    copiedTracking: 'Đã sao chép mã vận đơn',
    returnRequested: 'Yêu cầu đổi/trả đã gửi thành công',
  },
  checkout: {
    couponApplied: (code: string) => `Áp dụng mã ${code} thành công`,
    couponRemoved: 'Đã xóa mã giảm giá',
    orderPlaced: 'Đặt hàng thành công',
  },
  address: {
    saved: 'Đã lưu địa chỉ',
    deleted: 'Đã xoá địa chỉ',
    defaultSet: 'Đã chọn địa chỉ mặc định',
  },
  review: {
    submitted: 'Đã gửi đánh giá',
    errorSelectStars: 'Vui lòng chọn số sao đánh giá',
    errorEmptyContent: 'Vui lòng nhập nội dung đánh giá',
    pendingModeration: 'Đã đánh giá',
  },
  notifications: {
    markedAllRead: 'Đã đánh dấu tất cả đã đọc',
    deleted: 'Đã xóa thông báo',
  },
  contact: {
    messageSent: 'Cảm ơn bạn! Tin nhắn đã được gửi.',
  },
  common: {
    error: 'Thao tác thất bại',
    loading: 'Đang tải...',
    success: 'Thành công',
  },
} as const;

export type ClientToastMessages = typeof CLIENT_TOAST_MESSAGES;
