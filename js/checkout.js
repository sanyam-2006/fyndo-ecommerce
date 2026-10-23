// ========================================================
// Fyndo Checkout: Address Selection & Order Confirmation
// ========================================================

// Default Saved Address for Tindola, 225003
let userAddress = {
  fullName: "Rahul Verma",
  phone: "9876543210",
  houseNo: "House No. 42, Near Primary School",
  area: "Village Tindola",
  city: "Tindola",
  pincode: "225003",
  state: "Uttar Pradesh"
};

// 1. Open Address & Checkout Modal
function openCheckoutModal() {
  const modal = document.getElementById("checkout-modal");
  if (!modal) return;

  const { totalItems, finalPayable, totalSavings } = calculateCartTotals();

  modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <h3><i class="fa-solid fa-location-dot"></i> Select Delivery Address</h3>
        <button class="btn-close-modal" onclick="closeCheckoutModal()"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div class="modal-body">
        <!-- Order Quick Snapshot -->
        <div class="checkout-order-summary-box">
          <div class="checkout-summary-item">
            <span>Items to Deliver:</span>
            <strong>${totalItems} Items</strong>
          </div>
          <div class="checkout-summary-item">
            <span>You are Saving:</span>
            <strong class="text-green">₹${totalSavings}</strong>
          </div>
          <div class="checkout-summary-item total-item">
            <span>Total Payable:</span>
            <strong class="text-orange">₹${finalPayable}</strong>
          </div>
        </div>

        <!-- Address Selection Form -->
        <form id="address-form" onsubmit="handleConfirmOrder(event)">
          <div class="saved-address-card selected">
            <div class="address-radio-row">
              <input type="radio" id="default-addr" name="selected_address" checked />
              <label for="default-addr">
                <strong>Deliver to This Address (Recommended)</strong>
                <span class="badge-home">HOME</span>
              </label>
            </div>
            <div class="address-details-text">
              <p class="addr-name">${userAddress.fullName} <span class="addr-phone">(${userAddress.phone})</span></p>
              <p class="addr-line">${userAddress.houseNo}, ${userAddress.area}</p>
              <p class="addr-city">${userAddress.city}, ${userAddress.state} - <strong>${userAddress.pincode}</strong></p>
            </div>
          </div>

          <!-- Payment Mode Note (No real payment, Pay on Delivery) -->
          <div class="payment-method-box">
            <div class="payment-option">
              <i class="fa-solid fa-money-bill-wave"></i>
              <div>
                <strong>Cash / UPI on Delivery (Selected)</strong>
                <p>Pay safely when your order arrives at Tindola within 24 hours.</p>
              </div>
            </div>
          </div>

          <!-- Confirm Button -->
          <button type="submit" class="btn-confirm-order">
            <span>Confirm Order • ₹${finalPayable}</span>
            <i class="fa-solid fa-circle-check"></i>
          </button>
        </form>
      </div>
    </div>
  `;

  modal.classList.remove("hidden");
}

function closeCheckoutModal() {
  const modal = document.getElementById("checkout-modal");
  if (modal) modal.classList.add("hidden");
}

// 2. Handle Order Confirmation (Generates Order ID & Clears Cart)
function handleConfirmOrder(event) {
  event.preventDefault();

  const { finalPayable, totalSavings, totalItems } = calculateCartTotals();
  const orderId = "FYN-" + Math.floor(100000 + Math.random() * 900000);
  const orderDate = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  // Close modals & cart
  closeCheckoutModal();
  closeCartDrawer();

  // Clear Cart from State and LocalStorage
  cart = [];
  localStorage.removeItem(CART_STORAGE_KEY);
  updateHeaderCartInfo();

  // Show Order Success Screen
  renderOrderSuccessModal(orderId, orderDate, finalPayable, totalSavings, totalItems);
}

// 3. Render Order Confirmation Success Screen
function renderOrderSuccessModal(orderId, orderDate, totalPaid, totalSaved, totalItems) {
  const successModal = document.getElementById("order-success-modal");
  if (!successModal) return;

  successModal.innerHTML = `
    <div class="modal-card success-card">
      <div class="success-icon-wrap">
        <i class="fa-solid fa-circle-check"></i>
      </div>
      
      <h2 class="success-title">Order Placed Successfully!</h2>
      <p class="success-subtitle">
        Your group deal has been locked! We are preparing your order for delivery.
      </p>

      <!-- Order Receipt Details -->
      <div class="order-receipt-box">
        <div class="receipt-row">
          <span>Order Reference ID:</span>
          <strong>#${orderId}</strong>
        </div>
        <div class="receipt-row">
          <span>Order Placed On:</span>
          <span>${orderDate}</span>
        </div>
        <div class="receipt-row">
          <span>Delivering To:</span>
          <span><strong>${userAddress.city}, ${userAddress.pincode}</strong></span>
        </div>
        <div class="receipt-row">
          <span>Estimated Delivery:</span>
          <span class="text-green"><strong>Tomorrow by 5:00 PM</strong></span>
        </div>
        <div class="receipt-row">
          <span>Total Items:</span>
          <span>${totalItems}</span>
        </div>
        <hr class="receipt-divider" />
        <div class="receipt-row">
          <span>Community Savings:</span>
          <strong class="text-green">₹${totalSaved} Saved</strong>
        </div>
        <div class="receipt-row total-receipt-row">
          <span>Amount to Pay on Delivery:</span>
          <strong class="receipt-total">₹${totalPaid}</strong>
        </div>
      </div>

      <div class="success-delivery-badge">
        <i class="fa-solid fa-truck-fast"></i>
        <span>Free doorstep delivery to Tindola, 225003</span>
      </div>

      <button class="btn-success-continue" onclick="closeOrderSuccessModal()">
        Continue Shopping on Fyndo
      </button>
    </div>
  `;

  successModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeOrderSuccessModal() {
  const successModal = document.getElementById("order-success-modal");
  if (successModal) {
    successModal.classList.add("hidden");
    document.body.style.overflow = "auto";
  }
  // Re-render empty cart
  renderCartDrawer();
}