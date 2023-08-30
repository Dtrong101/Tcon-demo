import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Component, OnInit } from '@angular/core';
import { CartService } from 'src/app/sharepage/services/cart.service';
import { Item } from 'src/app/sharepage/services/item';
import { AuthService } from 'src/app/sharepage/services/auth.service';
import { User } from 'src/app/sharepage/services/user';
import { MatSnackBar } from '@angular/material/snack-bar';


@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css'],
})
export class CartComponent implements OnInit {
  cartItems: Item[] = [];
  total: number = 0;
  userInfo: User | any;
  guestInfo: any = {}; // Đặt giá trị mặc định là một đối tượng trống
  isLoggedIn: boolean = false;

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private afs: AngularFirestore,
  ) {}

  ngOnInit() {
    this.cartItems = this.cartService.getCartItems();
    this.calculateTotal();

    this.authService.afAuth.authState.subscribe((user: any) => {
      this.isLoggedIn = !!user;
      if (this.isLoggedIn) {
        this.authService.getUserInfo(user.uid).subscribe((userInfo) => {
          this.userInfo = userInfo;
          // Điền thông tin người dùng vào form khi đã đăng nhập
          if (this.userInfo) {
            this.guestName = this.userInfo.displayName || '';
            this.guestEmail = this.userInfo.email || '';
            this.guestAddress = this.userInfo.address || '';
            this.guestPhone = this.userInfo.phone || '';
          }
        });
      }
    });
  }

  private showSuccessToast(message: string): void {
    this.snackBar.open(message, 'Đóng', {
      duration: 3000, // Thời gian hiển thị toast message (đơn vị: milliseconds)
      verticalPosition: 'top',
      horizontalPosition: 'center',
      panelClass:['success']
    });
  }


  private calculateTotal() {
    this.total = this.cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  removeFromCart(item: Item) {
    this.cartService.removeFromCart(item);
    this.calculateTotal();
  }

  clearCart() {
    this.cartService.clearCart();
    this.cartItems = [];
    this.total = 0;
  }

  updateQuantity(item: Item) {
    this.cartService.updateCartItemQuantity(item);
    this.calculateTotal();
  }

  async checkout() {
    if (this.isLoggedIn && this.userInfo) {
      // Cập nhật thông tin người dùng từ form nhập liệu
      this.userInfo.displayName = this.guestName;
      this.userInfo.email = this.guestEmail;
      this.userInfo.address = this.guestAddress;
      this.userInfo.phone = this.guestPhone;

      // Cập nhật thông tin người dùng trên Firestore
      this.authService.updateUserInfo(this.userInfo.uid, this.userInfo)
        .then(() => {
          this.showSuccessToast('Đặt hàng thành công!');
          this.saveOrderToFirestore();
        })
        .catch((error) => {
          window.alert('Lưu thông tin người dùng không thành công!');
        });
    } else {
      // Gán thông tin người mua từ form nhập liệu vào guestInfo
      this.guestInfo = {
        name: this.guestName,
        email: this.guestEmail,
        address: this.guestAddress,
        phone: this.guestPhone,
      };

      // Lưu thông tin đơn hàng của khách vào Firestore
      this.authService.saveGuestOrder(this.cartItems, this.guestInfo)
        .then(() => {
          this.showSuccessToast('Đặt hàng thành công!');
          // console.log('Đã xác nhận đơn hàng thành công.');
          this.saveOrderToFirestore();
        })
        .catch((error) => {
          window.alert('Lưu thông tin đơn hàng của khách không thành công!');
        });
    }
  }

  saveOrderToFirestore() {
    // Lưu thông tin đơn hàng vào Firestore
    const orderId = this.afs.createId();
    const orderData = {
      id: orderId,
      cartItems: this.cartItems,
      buyer: this.userInfo || this.guestInfo,
      orderTime: new Date(),
      total: this.total,
      paymentMethod: this.selectedPaymentMethod,
    };

    // Thực hiện lưu vào Firestore
    this.authService.saveOrder(orderData)
      .then(() => {
        console.log('Đã lưu thông tin đơn hàng vào Firestore');
        this.cartService.clearCart();
        this.resetForm();
      })
      .catch((error) => {
        console.error('Lỗi khi lưu thông tin đơn hàng vào Firestore:', error);
      });

      this.clearCart();
  }

  resetForm() {
    // Reset giá trị của guestInfo về một đối tượng trống
    this.guestInfo = {};

    // Reset form nhập liệu cho guest
    this.guestName = '';
    this.guestEmail = '';
    this.guestAddress = '';
    this.guestPhone = '';
  }

  // Tạo các biến để lưu thông tin nhập liệu của guest thông qua ngModel
  guestName: string = '';
  guestEmail: string = '';
  guestAddress: string = '';
  guestPhone: string = '';
  selectedPaymentMethod: string = '';

  CartNotEmpty(): boolean {
    return this.cartItems.length > 0 && (this.selectedPaymentMethod === 'tiền mặt' || this.selectedPaymentMethod === 'thẻ tín dụng');
  }
  
}
