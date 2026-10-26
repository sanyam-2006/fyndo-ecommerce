// ========================================================
// Fyndo Cart Management: Solo vs Group Pricing & Financials
// ========================================================

const CART_STORAGE_KEY = "fyndo_cart_v1";

// 1. Initialize Cart
let cart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];

function saveCart() {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  updateHeaderCartInfo();
  renderCartDrawer();
}

// 2. Add Item to Cart (buyType: 'solo' or 'group')
function addToCart(productId, buyType) {
  const product = PRODUCTS.find((p) => p.id === productId);
  if (!product) return;

  const itemKey = `${productId}_${buyType}`;
  // Solo purchase uses soloPrice; Group deal uses groupPrice
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

// 6. Calculate Financials: Explicit Solo vs Group Segregation
function calculateCartTotals() {
  let totalItems = 0;
  let totalMRP = 0;
  let subtotal = 0;
  let groupSavings = 0;
  let groupItemsCount = 0;
  let soloItemsCount = 0;

  cart.forEach((item) => {
    totalItems += item.quantity;
    totalMRP += item.mrp * item.quantity;
    subtotal += item.price * item.quantity;

    if (item.buyType === "group") {
      groupItemsCount += item.quantity;
      const savingPerItem = Math.max(0, item.mrp - item.price);
      groupSavings += savingPerItem * item.quantity;
    } else {
      soloItemsCount += item.quantity;
    }
  });

  const hasGroupItems = groupItemsCount > 0;
  const hasSoloItems = soloItemsCount > 0;
  const isPureSoloOrder = totalItems > 0 && groupItemsCount === 0;

  // Free delivery for orders above ₹199
  const deliveryCharge = subtotal > 199 || subtotal === 0 ? 0 : 30;
  const finalPayable = subtotal + deliveryCharge;

  return {
    totalItems,
    totalMRP,
    subtotal,
    groupSavings,
    groupItemsCount,
    soloItemsCount,
    hasGroupItems,
    hasSoloItems,
    isPureSoloOrder,
    totalSavings: groupSavings,
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

// 8. Render Full-Screen Cart Drawer
function renderCartDrawer() {
  const drawer = document.getElementById("cart-drawer");
  if (!drawer) return;

  const {
    totalItems,
    totalMRP,
    subtotal,
    groupSavings,
    hasGroupItems,
    isPureSoloOrder,
    deliveryCharge,
    finalPayable
  } = calculateCartTotals();

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
        <p>You haven't added any items yet. Shop Solo or team up with neighbors to unlock community discounts!</p>
        <button class="btn-primary-large" onclick="closeCartDrawer()">Explore Deals</button>
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
        <!-- Conditional Banner: Shown only when Group Deal items exist, or neutral banner for Solo -->
        ${
          hasGroupItems && groupSavings > 0
            ? `
            <div class="cart-fs-savings-banner">
              <i class="fa-solid fa-users"></i>
              <div>
                <strong>Community Group Deal Active!</strong>
                <p>You are saving <strong>₹${groupSavings}</strong> with community group discounts on this order.</p>
              </div>
            </div>
            `
            : `
            <div class="cart-fs-savings-banner" style="background: #F8FAFC; border-color: #E2E8F0; color: #475569;">
              <i class="fa-solid fa-bag-shopping" style="color: #64748B;"></i>
              <div>
                <strong>Solo Purchase Mode</strong>
                <p style="margin: 0; font-size: 0.88rem; color: #64748B;">Standard pricing applied. Tip: Select "Buy with Group" on products to unlock extra savings!</p>
              </div>
            </div>
            `
        }

        <div class="cart-fs-items-container">
          ${cart
            .map((item) => {
              const isGroup = item.buyType === "group";
              const itemSavings = Math.max(0, item.mrp - item.price);
              return `
                <div class="cart-fs-item-card">
                  <img src="${item.image}" alt="${item.name}" class="cart-fs-img" />
                  
                  <div class="cart-fs-details">
                    <span class="cart-item-badge ${isGroup ? "group-badge" : "solo-badge"}">
                      ${isGroup ? '<i class="fa-solid fa-bolt"></i> Group Deal' : '<i class="fa-solid fa-user"></i> Solo Buy'}
                    </span>
                    <h3 class="cart-fs-item-name">${item.name}</h3>
                    <span class="cart-fs-item-unit">${item.unit}</span>
                    <div class="cart-fs-item-price-row">
                      <span class="cart-fs-price">₹${item.price}</span>
                      ${isGroup && item.mrp > item.price ? `<span class="cart-fs-mrp">₹${item.mrp}</span>` : ""}
                      ${
                        isGroup && itemSavings > 0
                          ? `<span class="cart-fs-save-tag"><i class="fa-solid fa-bolt"></i> Save ₹${itemSavings} each</span>`
                          : ""
                      }
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
          
          ${
            hasGroupItems && groupSavings > 0
              ? `
              <div class="bill-row">
                <span>Total Item MRP</span>
                <span>₹${totalMRP}</span>
              </div>
              <div class="bill-row savings-row">
                <span><i class="fa-solid fa-bolt"></i> Group Discount Savings</span>
                <span class="savings-amount">- ₹${groupSavings}</span>
              </div>
              `
              : `
              <div class="bill-row">
                <span>Items Subtotal</span>
                <span>₹${subtotal}</span>
              </div>
              <div class="bill-row">
                <span>Pricing Mode</span>
                <span><strong style="color: #64748b;">Solo Buy (No Group Discount)</strong></span>
              </div>
              `
          }

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

// 9. Open / Close Helpers
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