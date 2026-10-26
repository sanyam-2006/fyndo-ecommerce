// ========================================================
// Fyndo Checkout: Dynamic Delivery Estimation & Order Sync
// ========================================================

// Default fallback address
let userAddress = {
  fullName: "Sanyam Verma",
  phone: "9876543210",
  houseNo: "House No. 12, Main Bazar",
  area: "Village Tindola",
  city: "Tindola",
  pincode: "225003",
  state: "Uttar Pradesh"
};

// Helper: Calculate 2-Hour Delivery Estimate Rounded to Next Whole Hour
// Example: If order placed at 12:19 PM, +2 hours rounded up = 3:00 PM ("Today before 3:00 PM")
function getEstimatedDeliveryInfo(orderDateObj = new Date()) {
  const currentHour = orderDateObj.getHours(); // 0 - 23
  const currentMinutes = orderDateObj.getMinutes(); // 0 - 59

  // Delivery takes ~2 hours; rounding up to the next round hour if minutes > 0
  let targetHour = currentHour + 2 + (currentMinutes > 0 ? 1 : 0);

  let isTomorrow = false;
  if (targetHour >= 24) {
    isTomorrow = true;
    targetHour = targetHour % 24;
  }

  const period = targetHour >= 12 ? "PM" : "AM";
  const displayHour = targetHour % 12 === 0 ? 12 : targetHour % 12;
  const timeFormatted = `${displayHour}:00 ${period}`;
  const dayFormatted = isTomorrow ? "Tomorrow" : "Today";
  const deliveryText = `${dayFormatted} before ${timeFormatted}`;

  // Millisecond timestamp when delivery is considered reached
  const targetDate = new Date(orderDateObj);
  if (isTomorrow) {
    targetDate.setDate(targetDate.getDate() + 1);
  }
  targetDate.setHours(targetHour, 0, 0, 0);

  return {
    deliveryText: deliveryText,
    deliveryTimestamp: targetDate.getTime(),
    timeFormatted: timeFormatted,
    dayFormatted: dayFormatted
  };
}

// 1. Open Address & Checkout Modal
function openCheckoutModal() {
  const modal = document.getElementById("checkout-modal");
  if (!modal) return;

  const { totalItems, finalPayable, groupSavings, hasGroupItems } = calculateCartTotals();
  const currentDef = typeof getDefaultAddress === "function" ? getDefaultAddress() : userAddress;

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
          ${
            hasGroupItems && groupSavings > 0
              ? `
              <div class="checkout-summary-item">
                <span>Group Savings:</span>
                <strong class="text-green">₹${groupSavings} Saved</strong>
              </div>
              `
              : `
              <div class="checkout-summary-item">
                <span>Purchase Mode:</span>
                <strong style="color: #64748b;">Solo Buy</strong>
              </div>
              `
          }
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
                <strong>Deliver to Default Address</strong>
                <span class="badge-home">${currentDef.tag || "HOME"}</span>
              </label>
            </div>
            <div class="address-details-text">
              <p class="addr-name">${currentDef.fullName} <span class="addr-phone">(${currentDef.phone})</span></p>
              <p class="addr-line">${currentDef.houseNo}, ${currentDef.area || ""}</p>
              <p class="addr-city">${currentDef.city}, ${currentDef.state || "Uttar Pradesh"} - <strong>${currentDef.pincode}</strong></p>
            </div>
          </div>

          <!-- Payment Mode Note -->
          <div class="payment-method-box">
            <div class="payment-option">
              <i class="fa-solid fa-money-bill-wave"></i>
              <div>
                <strong>Cash / UPI on Delivery (Selected)</strong>
                <p>Pay safely when your order arrives at ${currentDef.city} in ~2 hours.</p>
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

// 2. Handle Order Confirmation & Save to Profile Orders
function handleConfirmOrder(event) {
  event.preventDefault();

  const { finalPayable, groupSavings, hasGroupItems, hasSoloItems, totalItems } = calculateCartTotals();
  const orderId = "FYN-" + Math.floor(100000 + Math.random() * 900000);
  
  const now = new Date();
  const orderDate = now.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
  const placementTime = now.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });

  // Calculate dynamic 2-hour delivery estimate based on current time
  const estDelivery = getEstimatedDeliveryInfo(now);

  const currentDef = typeof getDefaultAddress === "function" ? getDefaultAddress() : userAddress;
  const deliveryAddrText = `${currentDef.houseNo}, ${currentDef.area || ""}, ${currentDef.city} - ${currentDef.pincode}`;

  const buyTypeSummary = hasGroupItems && hasSoloItems ? "Mixed Deal" : (hasGroupItems ? "Group Deal" : "Solo Buy");

  // RECORD TO ORDERS STATE
  if (typeof userOrdersList !== "undefined") {
    userOrdersList.unshift({
      orderId: orderId,
      date: orderDate,
      placementTime: placementTime,
      placedTimestamp: now.getTime(),
      status: "active", // Starts as 'active' (Out for Delivery)
      deliveryTimestamp: estDelivery.deliveryTimestamp, // Real timestamp when order automatically transitions to delivered
      estimatedDeliveryText: estDelivery.deliveryText,
      totalPaid: finalPayable,
      totalSaved: hasGroupItems ? groupSavings : 0,
      hasGroupItems: hasGroupItems,
      buyType: buyTypeSummary,
      itemsCount: totalItems,
      deliveryAddress: deliveryAddrText,
      items: cart.map((i) => ({ ...i }))
    });
    if (typeof saveOrders === "function") saveOrders();
  }

  // Close modals & cart
  closeCheckoutModal();
  closeCartDrawer();

  // Clear Cart from State and LocalStorage
  cart = [];
  localStorage.removeItem(CART_STORAGE_KEY);
  updateHeaderCartInfo();

  // Show Order Success Screen with 2-Hour Estimated Delivery and Group Discount Breakdown
  renderOrderSuccessModal(
    orderId,
    orderDate,
    placementTime,
    estDelivery.deliveryText,
    finalPayable,
    groupSavings,
    hasGroupItems,
    totalItems,
    deliveryAddrText
  );
}

// 3. Render Order Confirmation Success Screen
function renderOrderSuccessModal(
  orderId,
  orderDate,
  placementTime,
  estimatedDeliveryText,
  totalPaid,
  totalSaved,
  hasGroupItems,
  totalItems,
  deliveryAddrText
) {
  const successModal = document.getElementById("order-success-modal");
  if (!successModal) return;

  successModal.innerHTML = `
    <div class="modal-card success-card">
      <div class="success-icon-wrap">
        <i class="fa-solid fa-circle-check"></i>
      </div>
      
      <h2 class="success-title">Order Placed Successfully!</h2>
      <p class="success-subtitle">
        ${
          hasGroupItems
            ? "Your group deal has been locked! We are preparing your order for express community delivery."
            : "Your solo order has been confirmed! We are preparing your fresh grocery shipment."
        }
      </p>

      <!-- Order Receipt Details -->
      <div class="order-receipt-box">
        <div class="receipt-row">
          <span>Order Reference ID:</span>
          <strong>#${orderId}</strong>
        </div>
        <div class="receipt-row">
          <span>Order Placed On:</span>
          <span>${orderDate} at ${placementTime}</span>
        </div>
        <div class="receipt-row">
          <span>Delivering To:</span>
          <span><strong>${deliveryAddrText || "Tindola, 225003"}</strong></span>
        </div>
        <div class="receipt-row">
          <span>Estimated Delivery:</span>
          <span class="text-green"><strong><i class="fa-solid fa-bolt"></i> ${estimatedDeliveryText}</strong> (in ~2 hrs)</span>
        </div>
        <div class="receipt-row">
          <span>Total Items:</span>
          <span>${totalItems} Items</span>
        </div>

        <hr class="receipt-divider" />

        ${
          hasGroupItems && totalSaved > 0
            ? `
            <div class="receipt-row">
              <span>Group Discount Savings:</span>
              <strong class="text-green">₹${totalSaved} Saved</strong>
            </div>
            `
            : `
            <div class="receipt-row">
              <span>Purchase Mode:</span>
              <span><strong>Solo Buy (No Group Discount)</strong></span>
            </div>
            `
        }

        <div class="receipt-row total-receipt-row">
          <span>Amount to Pay on Delivery:</span>
          <strong class="receipt-total">₹${totalPaid}</strong>
        </div>
      </div>

      <div class="success-actions-row">
        <button class="btn-view-profile-orders" onclick="closeOrderSuccessModal(); openProfilePage('orders');">
          <i class="fa-solid fa-box-open"></i> View in My Orders
        </button>
        <button class="btn-success-continue" onclick="closeOrderSuccessModal()">
          Continue Shopping
        </button>
      </div>
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
  renderCartDrawer();
}