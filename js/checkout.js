// ========================================================
// Fyndo Checkout: Dynamic Delivery Estimation & Order Sync
// Supports New User Inline Address Input & Old User Saved Address
// ========================================================

// Fallback address reference (null for new visitors)
let userAddress = null;

// Helper: Calculate 2-Hour Delivery Estimate Rounded to Next Whole Hour
function getEstimatedDeliveryInfo(orderDateObj = new Date()) {
  const currentHour = orderDateObj.getHours(); // 0 - 23
  const currentMinutes = orderDateObj.getMinutes(); // 0 - 59

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
  const currentDef = typeof getDefaultAddress === "function" ? getDefaultAddress() : null;
  const detectedCity = (typeof detectedLocation !== "undefined" && detectedLocation.city && detectedLocation.city !== "Detecting Location...") ? detectedLocation.city : "";
  const detectedPin = (typeof detectedLocation !== "undefined" && detectedLocation.pincode) ? detectedLocation.pincode : "";

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

        <!-- Address Selection / Input Form -->
        <form id="address-form" onsubmit="handleConfirmOrder(event)">
          ${
            currentDef
              ? `
              <!-- EXISTING USER: Saved Default Address Card -->
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
                <div style="margin-top: 10px; text-align: right;">
                  <button type="button" class="btn-edit-addr" style="display: inline-flex;" onclick="closeCheckoutModal(); openProfilePage('address');">
                    <i class="fa-solid fa-pen-to-square"></i> Change or Add Address
                  </button>
                </div>
              </div>
              `
              : `
              <!-- NEW USER: Empty Delivery Address Form (Auto-prefills detected location) -->
              <div style="background: #FFF7ED; border: 1.5px solid #FFEDD5; border-radius: var(--radius-md); padding: 18px 20px; margin-bottom: 18px;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px;">
                  <i class="fa-solid fa-map-pin" style="color: var(--primary); font-size: 1.2rem;"></i>
                  <div>
                    <strong style="color: #9A3412; font-size: 1rem;">Enter Your Delivery Address</strong>
                    <p style="margin: 0; font-size: 0.82rem; color: #7C2D12;">Please enter your details to receive this order</p>
                  </div>
                </div>

                <div class="form-grid-2">
                  <div class="form-group">
                    <label><i class="fa-solid fa-user"></i> Full Name *</label>
                    <input type="text" id="chk-name" placeholder="Receiver's full name" required />
                  </div>
                  <div class="form-group">
                    <label><i class="fa-solid fa-phone"></i> Mobile Number *</label>
                    <input type="tel" id="chk-phone" placeholder="10-digit mobile number" required pattern="[0-9]{10}" />
                  </div>
                </div>

                <div class="form-group">
                  <label><i class="fa-solid fa-house"></i> Flat / House No. / Building *</label>
                  <input type="text" id="chk-house" placeholder="House No., Building Name" required />
                </div>

                <div class="form-group">
                  <label><i class="fa-solid fa-road"></i> Street / Area / Landmark *</label>
                  <input type="text" id="chk-area" placeholder="Street, Colony, Landmark" required />
                </div>

                <div class="form-grid-3">
                  <div class="form-group">
                    <label><i class="fa-solid fa-city"></i> City *</label>
                    <input type="text" id="chk-city" value="${detectedCity}" placeholder="City" required />
                  </div>
                  <div class="form-group">
                    <label><i class="fa-solid fa-map-pin"></i> Pincode *</label>
                    <input type="text" id="chk-pin" value="${detectedPin}" placeholder="6-digit Pincode" required pattern="[0-9]{6}" />
                  </div>
                  <div class="form-group">
                    <label><i class="fa-solid fa-tag"></i> Address Tag</label>
                    <select id="chk-tag" class="select-input">
                      <option value="HOME">Home</option>
                      <option value="WORK">Work</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>
              </div>
              `
          }

          <!-- Payment Mode Note -->
          <div class="payment-method-box">
            <div class="payment-option">
              <i class="fa-solid fa-money-bill-wave"></i>
              <div>
                <strong>Cash / UPI on Delivery (Selected)</strong>
                <p>Pay safely when your order arrives at your door in ~2 hours.</p>
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

  const estDelivery = getEstimatedDeliveryInfo(now);

  let currentDef = typeof getDefaultAddress === "function" ? getDefaultAddress() : null;
  let deliveryAddrText = "";

  if (currentDef) {
    // Old user with saved address
    deliveryAddrText = `${currentDef.houseNo}, ${currentDef.area || ""}, ${currentDef.city} - ${currentDef.pincode}`;
  } else {
    // New user who just filled the address form
    const chkName = document.getElementById("chk-name").value.trim();
    const chkPhone = document.getElementById("chk-phone").value.trim();
    const chkHouse = document.getElementById("chk-house").value.trim();
    const chkArea = document.getElementById("chk-area").value.trim();
    const chkCity = document.getElementById("chk-city").value.trim();
    const chkPin = document.getElementById("chk-pin").value.trim();
    const chkTag = document.getElementById("chk-tag").value;

    const newAddr = {
      id: "addr-" + Date.now(),
      fullName: chkName,
      phone: chkPhone,
      houseNo: chkHouse,
      area: chkArea,
      city: chkCity,
      pincode: chkPin,
      state: "Uttar Pradesh",
      tag: chkTag || "HOME",
      isDefault: true
    };

    if (typeof savedAddresses !== "undefined") {
      savedAddresses.push(newAddr);
      if (typeof saveAddresses === "function") saveAddresses();
    }

    deliveryAddrText = `${chkHouse}, ${chkArea}, ${chkCity} - ${chkPin}`;
    currentDef = newAddr;
  }

  const buyTypeSummary = hasGroupItems && hasSoloItems ? "Mixed Deal" : (hasGroupItems ? "Group Deal" : "Solo Buy");

  // RECORD TO ORDERS STATE
  if (typeof userOrdersList !== "undefined") {
    userOrdersList.unshift({
      orderId: orderId,
      date: orderDate,
      placementTime: placementTime,
      placedTimestamp: now.getTime(),
      status: "active",
      deliveryTimestamp: estDelivery.deliveryTimestamp,
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

  // Show Order Success Screen
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
          <span><strong>${deliveryAddrText || "Your Address"}</strong></span>
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