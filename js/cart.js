// ========================================================
// Fyndo Cart State: Manual Open Only & Toast Feedback
// ========================================================

const CART_STORAGE_KEY = "fyndo_cart_v1";

// 1. Initialize Cart
let cart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];

function saveCart() {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  updateHeaderCartInfo();
  renderCartDrawer();
}

// 2. Add Item to Cart (DOES NOT automatically open cart anymore!)
function addToCart(productId, buyType) {
  const product = PRODUCTS.find((p) => p.id === productId);
  if (!product) return;

  const itemKey = `${productId}_${buyType}`;
  const price = buyType === "group" ? product.groupPrice : product.soloPrice;
  const existingItem = cart.find((item) => item.key === itemKey);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      key: itemKey,
      id: product.id,
      name: product.name,
      unit: product.unit,
      image: product.image,
      mrp: product.mrp,
      price: price,
      buyType: buyType,
      quantity: 1
    });
  }

  saveCart();
  
  // Show quick notification on screen without navigating away
  showCartToast(product.name, buyType);
}

// 3. Quick Toast Notification
function showCartToast(productName, buyType) {
  let toast = document.getElementById("cart-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "cart-toast";
    toast.className = "cart-toast";
    document.body.appendChild(toast);
  }

  const typeLabel = buyType === "group" ? "Group Deal Price" : "Solo Price";
  toast.innerHTML = `
    <i class="fa-solid fa-circle-check"></i>
    <div class="toast-text">
      <strong>Added to Cart!</strong>
      <span>${productName.substring(0, 32)}... (${typeLabel})</span>
    </div>
  `;

  toast.classList.add("show");
  clearTimeout(toast.toastTimeout);
  toast.toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

// 4. Update Quantity (+1 or -1)
function updateCartQuantity(itemKey, delta) {
  const itemIndex = cart.findIndex((item) => item.key === itemKey);
  if (itemIndex === -1) return;

  cart[itemIndex].quantity += delta;
  if (cart[itemIndex].quantity <= 0) {
    cart.splice(itemIndex, 1);
  }

  saveCart();
}

// 5. Delete Item from Cart
function removeFromCart(itemKey) {
  cart = cart.filter((item) => item.key !== itemKey);
  saveCart();
}

// 6. Calculate Financials
function calculateCartTotals() {
  let totalItems = 0;
  let totalMRP = 0;
  let subtotal = 0;

  cart.forEach((item) => {
    totalItems += item.quantity;
    totalMRP += item.mrp * item.quantity;
    subtotal += item.price * item.quantity;
  });

  const totalSavings = totalMRP - subtotal;
  const deliveryCharge = subtotal > 199 || subtotal === 0 ? 0 : 30;
  const finalPayable = subtotal + deliveryCharge;

  return {
    totalItems,
    totalMRP,
    subtotal,
    totalSavings,
    deliveryCharge,
    finalPayable
  };
}

// 7. Update Header Cart Badge
function updateHeaderCartInfo() {
  const { totalItems, subtotal } = calculateCartTotals();
  const badge = document.getElementById("cart-badge");
  const totalDisplay = document.getElementById("header-cart-total");

  if (badge) badge.innerText = totalItems;
  if (totalDisplay) totalDisplay.innerText = `₹${subtotal}`;
}

// 8. Render FULL-SCREEN View
function renderCartDrawer() {
  const drawer = document.getElementById("cart-drawer");
  if (!drawer) return;

  const { totalItems, totalMRP, subtotal, totalSavings, deliveryCharge, finalPayable } = calculateCartTotals();

  // If Cart is Empty
  if (cart.length === 0) {
    drawer.innerHTML = `
      <div class="cart-fs-navbar">
        <div class="container cart-fs-nav-inner">
          <button class="btn-fs-back" onclick="closeCartDrawer()">
            <i class="fa-solid fa-arrow-left"></i> Continue Shopping
          </button>
          <h2 class="cart-fs-title"><i class="fa-solid fa-basket-shopping"></i> My Shopping Cart</h2>
          <button class="btn-fs-close" onclick="closeCartDrawer()"><i class="fa-solid fa-xmark"></i></button>
        </div>
      </div>
      <div class="cart-fs-empty">
        <i class="fa-solid fa-cart-arrow-down"></i>
        <h3>Your Cart is Currently Empty</h3>
        <p>You haven't added any items yet. Team up with neighbors to unlock community discounts!</p>
        <button class="btn-primary-large" onclick="closeCartDrawer()">Explore Group Deals</button>
      </div>
    `;
    return;
  }

  // If Cart Has Items -> Render Full Screen 2-Column Dashboard
  drawer.innerHTML = `
    <!-- Fullscreen Navbar -->
    <div class="cart-fs-navbar">
      <div class="container cart-fs-nav-inner">
        <button class="btn-fs-back" onclick="closeCartDrawer()">
          <i class="fa-solid fa-arrow-left"></i> Continue Shopping
        </button>
        <h2 class="cart-fs-title"><i class="fa-solid fa-basket-shopping"></i> Review Your Cart (${totalItems} items)</h2>
        <button class="btn-fs-close" onclick="closeCartDrawer()"><i class="fa-solid fa-xmark"></i></button>
      </div>
    </div>

    <!-- Main 2-Column Fullscreen Content -->
    <div class="container cart-fs-content">
      <!-- Left Column: Items List -->
      <div class="cart-fs-left">
        <div class="cart-fs-savings-banner">
          <i class="fa-solid fa-circle-check"></i>
          <div>
            <strong>Community Group Deal Active!</strong>
            <p>You are saving <strong>₹${totalSavings}</strong> off original MRP on this order.</p>
          </div>
        </div>

        <div class="cart-fs-items-container">
          ${cart
            .map((item) => {
              const isGroup = item.buyType === "group";
              return `
                <div class="cart-fs-item-card">
                  <img src="${item.image}" alt="${item.name}" class="cart-fs-img" />
                  
                  <div class="cart-fs-details">
                    <span class="cart-item-badge ${isGroup ? "group-badge" : "solo-badge"}">
                      ${isGroup ? '<i class="fa-solid fa-bolt"></i> Group Deal' : 'Solo Buy'}
                    </span>
                    <h3 class="cart-fs-item-name">${item.name}</h3>
                    <span class="cart-fs-item-unit">${item.unit}</span>
                    <div class="cart-fs-item-price-row">
                      <span class="cart-fs-price">₹${item.price}</span>
                      <span class="cart-fs-mrp">₹${item.mrp}</span>
                      <span class="cart-fs-save-tag">Save ₹${item.mrp - item.price} each</span>
                    </div>
                  </div>

                  <!-- Quantity Controls & Delete -->
                  <div class="cart-fs-qty-section">
                    <div class="qty-pill">
                      <button class="qty-btn" onclick="updateCartQuantity('${item.key}', -1)">-</button>
                      <span class="qty-value">${item.quantity}</span>
                      <button class="qty-btn" onclick="updateCartQuantity('${item.key}', 1)">+</button>
                    </div>
                    <div class="cart-fs-item-subtotal">₹${item.price * item.quantity}</div>
                    <button class="btn-delete-item" onclick="removeFromCart('${item.key}')">
                      <i class="fa-regular fa-trash-can"></i> Delete
                    </button>
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
      </div>

      <!-- Right Column: Prominent Bill Card & Huge Total Box -->
      <div class="cart-fs-right">
        <div class="cart-fs-bill-card">
          <!-- BIG PROMINENT TOTAL TO BE PAID -->
          <div class="cart-total-pay-box">
            <span class="pay-label">Total Amount to be Paid:</span>
            <span class="pay-amount-huge">₹${finalPayable}</span>
            <span class="pay-subtext">(Inclusive of all taxes & delivery)</span>
          </div>

          <h3 class="bill-title">Order Bill Breakdown</h3>
          <div class="bill-row">
            <span>Total Item MRP</span>
            <span>₹${totalMRP}</span>
          </div>
          <div class="bill-row savings-row">
            <span>Group Discount Savings</span>
            <span>- ₹${totalSavings}</span>
          </div>
          <div class="bill-row">
            <span>Delivery Fee</span>
            <span>${deliveryCharge === 0 ? '<strong class="free-tag">FREE (Orders above ₹199)</strong>' : `₹${deliveryCharge}`}</span>
          </div>

          <hr class="bill-divider" />

          <div class="bill-row grand-total-row">
            <span>Final Amount</span>
            <span class="payable-amount">₹${finalPayable}</span>
          </div>

          <!-- Proceed to Checkout Button -->
          <button class="btn-proceed-checkout" onclick="openCheckoutModal()">
            <span>Proceed to Address & Confirm</span>
            <i class="fa-solid fa-arrow-right"></i>
          </button>

          <p class="safe-checkout-note">
            <i class="fa-solid fa-shield-halved"></i> 100% Safe & Verified Community Checkout
          </p>
        </div>
      </div>
    </div>
  `;
}

// 9. Open / Close Helpers (Only opened via Cart Button)
function openCartDrawer() {
  const drawer = document.getElementById("cart-drawer");
  if (drawer) {
    drawer.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }
  renderCartDrawer();
}

function closeCartDrawer() {
  const drawer = document.getElementById("cart-drawer");
  if (drawer) {
    drawer.classList.add("hidden");
    document.body.style.overflow = "auto";
  }
}