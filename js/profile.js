// ===================================================================
// FYNDO USER PROFILE, ADDRESS BOOK, AUTO-DELIVERY & ORDER MANAGEMENT
// ===================================================================

const ADDRESS_STORAGE_KEY = "fyndo_addresses_v1";
const ORDERS_STORAGE_KEY = "fyndo_orders_v1";

// 1. Initial Default Address Book (Updated for Sanyam Baranwal, Lakhimpur-Kheri)
let savedAddresses = JSON.parse(localStorage.getItem(ADDRESS_STORAGE_KEY)) || [
  {
    id: "addr-1",
    fullName: "Sanyam Baranwal",
    phone: "9336038779",
    houseNo: "69, Maharaj Nagar",
    area: "behind style bazaar",
    city: "Lakhimpur-Kheri",
    pincode: "262701",
    state: "Uttar Pradesh",
    tag: "HOME",
    isDefault: true
  }
];

// Automatically update if legacy data exists in browser localStorage
if (savedAddresses.length > 0 && (savedAddresses[0].fullName === "Sanyam Verma" || savedAddresses[0].city === "Tindola")) {
  savedAddresses = [
    {
      id: "addr-1",
      fullName: "Sanyam Baranwal",
      phone: "9336038779",
      houseNo: "69, Maharaj Nagar",
      area: "behind style bazaar",
      city: "Lakhimpur-Kheri",
      pincode: "262701",
      state: "Uttar Pradesh",
      tag: "HOME",
      isDefault: true
    }
  ];
  localStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(savedAddresses));
}

// 2. Initial Orders List
let userOrdersList = JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY)) || [
  {
    orderId: "FYN-839201",
    date: "25 Oct 2026",
    placementTime: "11:30 AM",
    status: "delivered", // 'active', 'delivered', 'cancelled'
    deliveryTimestamp: Date.now() - 3600000,
    estimatedDeliveryText: "Delivered on schedule",
    deliveredAt: "1:30 PM",
    totalPaid: 209,
    totalSaved: 86,
    hasGroupItems: true,
    buyType: "Group Deal",
    itemsCount: 1,
    deliveryAddress: "69, Maharaj Nagar, behind style bazaar, Lakhimpur-Kheri - 262701",
    items: [
      {
        name: "Aashirvaad Superior MP Shudh Chakki Atta",
        unit: "5 kg Heavy Bag",
        price: 209,
        quantity: 1,
        image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=60"
      }
    ]
  }
];

function saveAddresses() {
  localStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(savedAddresses));
  syncActiveAddressToNavbar();
}

function saveOrders() {
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(userOrdersList));
}

// ===================================================================
// AUTO-DELIVERY REAL-TIME CHECKER
// Checks real current time against order.deliveryTimestamp
// Automatically updates status from 'active' to 'delivered'
// ===================================================================
function checkAndUpdateAutoDelivery() {
  const currentTime = Date.now();
  let hasUpdates = false;

  userOrdersList.forEach((order) => {
    // If order is active and current time has passed the scheduled delivery timestamp
    if (order.status === "active" && order.deliveryTimestamp && currentTime >= order.deliveryTimestamp) {
      order.status = "delivered";
      order.deliveredAt = new Date(order.deliveryTimestamp).toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      });
      hasUpdates = true;
    }
  });

  if (hasUpdates) {
    saveOrders();
  }
}

// Test Helper: Allows instantly marking an order as Delivered without waiting 2 hours
function simulateOrderDelivery(orderId) {
  const target = userOrdersList.find((o) => o.orderId === orderId);
  if (target) {
    target.status = "delivered";
    target.deliveredAt = new Date().toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
    saveOrders();
    renderProfileContent();
    showToastNotification(`🚚 Order #${orderId} marked as Delivered! (Auto-transition test)`);
  }
}

// 3. Open & Close Profile Dashboard
let currentProfileTab = "orders";
let currentOrdersSubTab = "active";

function openProfilePage(tab = "orders") {
  const modal = document.getElementById("profile-modal");
  if (!modal) return;
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  switchProfileTab(tab);
}

function closeProfilePage() {
  const modal = document.getElementById("profile-modal");
  if (modal) {
    modal.classList.add("hidden");
    document.body.style.overflow = "auto";
  }
}

// 4. Switch Main Sidebar Tab
function switchProfileTab(tab) {
  currentProfileTab = tab;
  
  document.querySelectorAll(".profile-nav-item").forEach((el) => {
    el.classList.remove("active");
  });
  const activeNavItem = document.getElementById(`pnav-${tab}`);
  if (activeNavItem) activeNavItem.classList.add("active");

  renderProfileContent();
}

// 5. Render Content Area
function renderProfileContent() {
  const contentArea = document.getElementById("profile-tab-content");
  if (!contentArea) return;

  if (currentProfileTab === "orders") {
    renderOrdersTab(contentArea);
  } else if (currentProfileTab === "address") {
    renderAddressBookTab(contentArea);
  } else if (currentProfileTab === "rate") {
    renderRateFyndoTab(contentArea);
  }
}

// --- TAB 1: ORDERS MANAGEMENT (Active, Delivered, Cancelled) ---
function renderOrdersTab(container) {
  // Always run real-time check before rendering orders!
  checkAndUpdateAutoDelivery();

  const filtered = userOrdersList.filter((o) => {
    if (currentOrdersSubTab === "all") return true;
    return o.status === currentOrdersSubTab;
  });

  const activeCount = userOrdersList.filter((o) => o.status === "active").length;
  const deliveredCount = userOrdersList.filter((o) => o.status === "delivered").length;
  const cancelledCount = userOrdersList.filter((o) => o.status === "cancelled").length;

  container.innerHTML = `
    <div class="profile-content-header">
      <h2><i class="fa-solid fa-box-open"></i> My Orders</h2>
      <p>Live status & 2-hour delivery tracking with automatic delivery confirmation.</p>
    </div>

    <!-- Orders Filter Pills -->
    <div class="orders-filter-bar">
      <button class="order-filter-pill ${currentOrdersSubTab === "active" ? "active" : ""}" onclick="switchOrdersSubTab('active')">
        Active Orders (${activeCount})
      </button>
      <button class="order-filter-pill ${currentOrdersSubTab === "delivered" ? "active" : ""}" onclick="switchOrdersSubTab('delivered')">
        Delivered (${deliveredCount})
      </button>
      <button class="order-filter-pill ${currentOrdersSubTab === "cancelled" ? "active" : ""}" onclick="switchOrdersSubTab('cancelled')">
        Cancelled (${cancelledCount})
      </button>
      <button class="order-filter-pill ${currentOrdersSubTab === "all" ? "active" : ""}" onclick="switchOrdersSubTab('all')">
        All Orders (${userOrdersList.length})
      </button>
    </div>

    <!-- Orders List -->
    <div class="orders-display-list">
      ${
        filtered.length === 0
          ? `<div class="empty-orders-state">
              <i class="fa-solid fa-box"></i>
              <h3>No ${currentOrdersSubTab} orders found</h3>
              <p>Explore daily group deals with neighbors or solo grocery deals to unlock savings!</p>
              <button class="btn-primary-large" onclick="closeProfilePage()">Browse Products</button>
            </div>`
          : filtered
              .map((order) => {
                const statusBadge =
                  order.status === "active"
                    ? `<span class="badge-status status-active"><i class="fa-solid fa-truck-fast"></i> Out for Delivery</span>`
                    : order.status === "delivered"
                    ? `<span class="badge-status status-delivered"><i class="fa-solid fa-circle-check"></i> Delivered</span>`
                    : `<span class="badge-status status-cancelled"><i class="fa-solid fa-ban"></i> Cancelled</span>`;

                const isGroupDeal = order.hasGroupItems || (order.totalSaved && order.totalSaved > 0);
                const savingsText = isGroupDeal && order.totalSaved > 0 ? `(Saved ₹${order.totalSaved} via Group Deal)` : `(Solo Buy)`;

                return `
                  <div class="profile-order-card">
                    <div class="order-card-top">
                      <div>
                        <span class="order-id-label">Order ID: <strong>#${order.orderId}</strong></span>
                        <span class="order-date-label">Placed: ${order.date} ${order.placementTime ? `at ${order.placementTime}` : ""}</span>
                      </div>
                      ${statusBadge}
                    </div>

                    <div class="order-card-items">
                      ${order.items
                        .map(
                          (item) => `
                        <div class="order-item-snippet">
                          <img src="${item.image}" alt="${item.name}" />
                          <div>
                            <h4>${item.name}</h4>
                            <span>Qty: ${item.quantity} • ₹${item.price} each ${item.buyType === "solo" ? "(Solo)" : "(Group Deal)"}</span>
                          </div>
                        </div>
                      `
                        )
                        .join("")}
                    </div>

                    <div class="order-card-footer">
                      <div class="order-meta-info">
                        <span>Delivering To: <strong>${order.deliveryAddress}</strong></span>
                        ${
                          order.status === "active"
                            ? `<span>Est. Delivery: <strong class="text-green"><i class="fa-solid fa-clock"></i> ${order.estimatedDeliveryText || "Within 2 Hours"}</strong></span>`
                            : order.status === "delivered"
                            ? `<span>Delivery: <strong class="text-green"><i class="fa-solid fa-circle-check"></i> ${order.deliveredAt ? `Delivered at ${order.deliveredAt}` : (order.estimatedDeliveryText || "Delivered on schedule")}</strong></span>`
                            : ""
                        }
                        <span class="order-total-paid">Total Amount: <strong>₹${order.totalPaid}</strong> ${savingsText}</span>
                      </div>

                      <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                        ${
                          order.status === "active"
                            ? `
                            <button class="btn-cancel-order" onclick="cancelUserOrder('${order.orderId}')">
                              <i class="fa-solid fa-xmark"></i> Cancel Order
                            </button>
                            <button class="btn-cancel-order" style="background: #ECFDF5; border-color: #A7F3D0; color: #059669;" onclick="simulateOrderDelivery('${order.orderId}')" title="Test Auto-Delivered (Skip 2 Hours)">
                              <i class="fa-solid fa-circle-check"></i> Test Delivered
                            </button>
                            `
                            : ""
                        }
                      </div>
                    </div>
                  </div>
                `;
              })
              .join("")
      }
    </div>
  `;
}

function switchOrdersSubTab(sub) {
  currentOrdersSubTab = sub;
  renderProfileContent();
}

function cancelUserOrder(orderId) {
  if (confirm("Are you sure you want to cancel this order?")) {
    const target = userOrdersList.find((o) => o.orderId === orderId);
    if (target) {
      target.status = "cancelled";
      saveOrders();
      renderProfileContent();
      showToastNotification("Order #" + orderId + " has been cancelled.");
    }
  }
}

// --- TAB 2: ADDRESS BOOK (Full Add, Edit, Change Default, Delete) ---
function renderAddressBookTab(container) {
  container.innerHTML = `
    <div class="profile-content-header address-header-flex">
      <div>
        <h2><i class="fa-solid fa-map-location-dot"></i> Saved Addresses</h2>
        <p>Manage your delivery locations in Lakhimpur-Kheri for lightning-fast checkout.</p>
      </div>
      <button class="btn-add-addr-modal" onclick="toggleAddAddressForm(true, 'add')">
        <i class="fa-solid fa-plus"></i> Add New Address
      </button>
    </div>

    <!-- Hidden by default Add / Edit Address Form -->
    <div id="new-address-form-box" class="new-address-form-box hidden">
      <div class="address-form-header">
        <h3 id="addr-form-heading"><i class="fa-solid fa-plus-circle"></i> Add a New Delivery Address</h3>
        <button type="button" class="btn-close-form" onclick="toggleAddAddressForm(false)">&times;</button>
      </div>

      <form onsubmit="handleSaveAddress(event)">
        <!-- Hidden input to store address ID during edit mode -->
        <input type="hidden" id="naddr-edit-id" value="" />

        <div class="form-grid-2">
          <div class="form-group">
            <label><i class="fa-solid fa-user"></i> Full Name</label>
            <input type="text" id="naddr-name" placeholder="Receiver full name" required />
          </div>
          <div class="form-group">
            <label><i class="fa-solid fa-phone"></i> Phone Number</label>
            <input type="tel" id="naddr-phone" placeholder="10-digit mobile number" required />
          </div>
        </div>

        <div class="form-group">
          <label><i class="fa-solid fa-house"></i> House / Flat / Building No.</label>
          <input type="text" id="naddr-house" placeholder="Flat No., House No., Building Name" required />
        </div>

        <div class="form-group">
          <label><i class="fa-solid fa-road"></i> Street / Colony / Landmark</label>
          <input type="text" id="naddr-area" placeholder="Street, Colony, Area or Landmark" required />
        </div>

        <div class="form-grid-3">
          <div class="form-group">
            <label><i class="fa-solid fa-city"></i> City</label>
            <input type="text" id="naddr-city" value="Lakhimpur-Kheri" required />
          </div>
          <div class="form-group">
            <label><i class="fa-solid fa-map-pin"></i> Pincode</label>
            <input type="text" id="naddr-pin" value="262701" required />
          </div>
          <div class="form-group">
            <label><i class="fa-solid fa-tag"></i> Address Tag</label>
            <select id="naddr-tag" class="select-input">
              <option value="HOME">Home</option>
              <option value="WORK">Work / Office</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        <div class="form-actions-row">
          <button type="button" class="btn-cancel-addr" onclick="toggleAddAddressForm(false)">Cancel</button>
          <button type="submit" id="btn-submit-addr" class="btn-save-addr">
            <i class="fa-solid fa-check"></i> Save Address
          </button>
        </div>
      </form>
    </div>

    <!-- Saved Address Cards -->
    <div class="address-cards-grid">
      ${savedAddresses
        .map((addr) => {
          return `
            <div class="profile-addr-card ${addr.isDefault ? "is-default" : ""}">
              <div class="addr-card-top">
                <span class="addr-tag-pill">${addr.tag}</span>
                ${addr.isDefault ? '<span class="badge-default-addr">CURRENT DEFAULT</span>' : ""}
              </div>

              <h4 class="addr-user-name">${addr.fullName} <span class="addr-user-phone">(${addr.phone})</span></h4>
              <p class="addr-full-text">${addr.houseNo}, ${addr.area}</p>
              <p class="addr-city-text">${addr.city}, ${addr.state} - <strong>${addr.pincode}</strong></p>

              <div class="addr-card-actions">
                ${
                  !addr.isDefault
                    ? `<button class="btn-set-default" onclick="setDefaultAddress('${addr.id}')">
                        <i class="fa-solid fa-check"></i> Deliver Here (Set Default)
                      </button>`
                    : '<span class="default-active-text"><i class="fa-solid fa-circle-check"></i> Selected for Deliveries</span>'
                }
                
                <div class="addr-actions-right">
                  <button class="btn-edit-addr" onclick="openEditAddressForm('${addr.id}')" title="Edit Address Details">
                    <i class="fa-solid fa-pen-to-square"></i> Edit
                  </button>

                  ${
                    savedAddresses.length > 1
                      ? `<button class="btn-delete-addr" onclick="deleteAddress('${addr.id}')" title="Delete Address">
                          <i class="fa-regular fa-trash-can"></i>
                        </button>`
                      : ""
                  }
                </div>
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function toggleAddAddressForm(show, mode = "add") {
  const formBox = document.getElementById("new-address-form-box");
  if (!formBox) return;

  if (show) {
    formBox.classList.remove("hidden");
    if (mode === "add") {
      const heading = document.getElementById("addr-form-heading");
      const submitBtn = document.getElementById("btn-submit-addr");
      if (heading) heading.innerHTML = `<i class="fa-solid fa-plus-circle"></i> Add a New Delivery Address`;
      if (submitBtn) submitBtn.innerHTML = `<i class="fa-solid fa-check"></i> Save Address`;

      // Clear all fields with Lakhimpur-Kheri defaults
      document.getElementById("naddr-edit-id").value = "";
      document.getElementById("naddr-name").value = "";
      document.getElementById("naddr-phone").value = "";
      document.getElementById("naddr-house").value = "";
      document.getElementById("naddr-area").value = "";
      document.getElementById("naddr-city").value = "Lakhimpur-Kheri";
      document.getElementById("naddr-pin").value = "262701";
      document.getElementById("naddr-tag").value = "HOME";
    }
    formBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } else {
    formBox.classList.add("hidden");
    const editIdInput = document.getElementById("naddr-edit-id");
    if (editIdInput) editIdInput.value = "";
  }
}

function openEditAddressForm(id) {
  const target = savedAddresses.find((a) => a.id === id);
  if (!target) return;

  toggleAddAddressForm(true, "edit");

  const heading = document.getElementById("addr-form-heading");
  const submitBtn = document.getElementById("btn-submit-addr");
  if (heading) heading.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Edit Delivery Address (${target.tag})`;
  if (submitBtn) submitBtn.innerHTML = `<i class="fa-solid fa-check-double"></i> Update Address`;

  document.getElementById("naddr-edit-id").value = target.id;
  document.getElementById("naddr-name").value = target.fullName || "";
  document.getElementById("naddr-phone").value = target.phone || "";
  document.getElementById("naddr-house").value = target.houseNo || "";
  document.getElementById("naddr-area").value = target.area || "";
  document.getElementById("naddr-city").value = target.city || "Lakhimpur-Kheri";
  document.getElementById("naddr-pin").value = target.pincode || "262701";
  document.getElementById("naddr-tag").value = target.tag || "HOME";

  document.getElementById("naddr-name").focus();
}

function handleSaveAddress(e) {
  e.preventDefault();
  const editId = document.getElementById("naddr-edit-id").value.trim();
  const name = document.getElementById("naddr-name").value.trim();
  const phone = document.getElementById("naddr-phone").value.trim();
  const house = document.getElementById("naddr-house").value.trim();
  const area = document.getElementById("naddr-area").value.trim();
  const city = document.getElementById("naddr-city").value.trim() || "Lakhimpur-Kheri";
  const pin = document.getElementById("naddr-pin").value.trim() || "262701";
  const tag = document.getElementById("naddr-tag").value;

  if (editId) {
    const target = savedAddresses.find((a) => a.id === editId);
    if (target) {
      target.fullName = name;
      target.phone = phone;
      target.houseNo = house;
      target.area = area;
      target.city = city;
      target.pincode = pin;
      target.tag = tag;

      saveAddresses();
      toggleAddAddressForm(false);
      renderProfileContent();
      showToastNotification(`Address for ${name} updated successfully!`);
    }
  } else {
    const newAddr = {
      id: "addr-" + Date.now(),
      fullName: name,
      phone: phone,
      houseNo: house,
      area: area,
      city: city,
      pincode: pin,
      state: "Uttar Pradesh",
      tag: tag,
      isDefault: savedAddresses.length === 0
    };

    savedAddresses.push(newAddr);
    saveAddresses();
    toggleAddAddressForm(false);
    renderProfileContent();
    showToastNotification("New address added successfully!");
  }
}

function setDefaultAddress(id) {
  savedAddresses.forEach((a) => {
    a.isDefault = a.id === id;
  });
  saveAddresses();
  renderProfileContent();
  showToastNotification("Delivery address updated to " + getDefaultAddress().city + "!");
}

function deleteAddress(id) {
  if (savedAddresses.length <= 1) {
    alert("You must keep at least one delivery address.");
    return;
  }
  if (confirm("Delete this address from your address book?")) {
    savedAddresses = savedAddresses.filter((a) => a.id !== id);
    if (!savedAddresses.some((a) => a.isDefault)) {
      savedAddresses[0].isDefault = true;
    }
    saveAddresses();
    renderProfileContent();
    showToastNotification("Address removed.");
  }
}

function getDefaultAddress() {
  return savedAddresses.find((a) => a.isDefault) || savedAddresses[0];
}

function syncActiveAddressToNavbar() {
  const def = getDefaultAddress();
  const navCity = document.getElementById("current-city");
  if (navCity && def) {
    navCity.innerText = `${def.city}, ${def.pincode}`;
  }
  if (typeof userAddress !== "undefined" && def) {
    userAddress.fullName = def.fullName;
    userAddress.phone = def.phone;
    userAddress.houseNo = `${def.houseNo}, ${def.area}`;
    userAddress.city = def.city;
    userAddress.pincode = def.pincode;
  }
}

// --- TAB 3: RATE FYNDO ---
let selectedRating = 5;

function renderRateFyndoTab(container) {
  container.innerHTML = `
    <div class="profile-content-header">
      <h2><i class="fa-solid fa-star"></i> Rate Your Fyndo Experience</h2>
      <p>Help us improve our community grocery and wholesale group buying service in Lakhimpur-Kheri.</p>
    </div>

    <div class="rate-fyndo-card">
      <h3>How would you rate our deals & delivery?</h3>
      
      <div class="star-rating-row" id="star-rating-row">
        ${[1, 2, 3, 4, 5]
          .map(
            (num) => `
          <button type="button" class="star-btn ${num <= selectedRating ? "filled" : ""}" onclick="setUserRating(${num})">
            <i class="fa-solid fa-star"></i>
          </button>
        `
          )
          .join("")}
      </div>
      <span class="rating-text-label" id="rating-text-label">Outstanding! (5 out of 5)</span>

      <div class="form-group" style="margin-top: 20px;">
        <label>Your Feedback / Suggestions for Lakhimpur-Kheri Hub</label>
        <textarea id="feedback-text" rows="4" placeholder="Tell us what items you want added, delivery speed, or pricing feedback..."></textarea>
      </div>

      <button class="btn-auth-submit" onclick="submitFyndoRating()">Submit Feedback</button>
    </div>
  `;
}

function setUserRating(stars) {
  selectedRating = stars;
  const labels = [
    "Poor (1/5)",
    "Fair (2/5)",
    "Good (3/5)",
    "Very Good (4/5)",
    "Outstanding! (5/5)"
  ];
  document.getElementById("rating-text-label").innerText = labels[stars - 1];
  
  const buttons = document.querySelectorAll(".star-btn");
  buttons.forEach((btn, idx) => {
    if (idx < stars) btn.classList.add("filled");
    else btn.classList.remove("filled");
  });
}

function submitFyndoRating() {
  showToastNotification(`⭐ Thank you for giving us ${selectedRating} stars! Feedback submitted.`);
  setTimeout(() => {
    switchProfileTab("orders");
  }, 1200);
}

// ===================================================================
// HOME PAGE LOCATION SELECTOR MODAL (CANNOT ADD NEW ADDRESS HERE)
// ===================================================================
function openHomeLocationModal() {
  const modal = document.getElementById("home-address-modal");
  if (!modal) return;

  modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <h3><i class="fa-solid fa-location-dot"></i> Select Delivery Location</h3>
        <button class="btn-close-modal" onclick="closeHomeLocationModal()"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div class="modal-body">
        <p class="home-location-subtext">Choose from your previously saved delivery addresses:</p>

        <div class="home-saved-addresses-list">
          ${savedAddresses
            .map((addr) => {
              return `
                <div class="home-addr-option ${addr.isDefault ? "selected" : ""}" onclick="selectHomeAddress('${addr.id}')">
                  <div class="home-addr-radio">
                    <input type="radio" name="home_addr_choice" ${addr.isDefault ? "checked" : ""} />
                  </div>
                  <div class="home-addr-info">
                    <div class="home-addr-tag-row">
                      <strong>${addr.fullName}</strong>
                      <span class="addr-tag-pill">${addr.tag}</span>
                      ${addr.isDefault ? '<span class="badge-home">CURRENT</span>' : ""}
                    </div>
                    <p>${addr.houseNo}, ${addr.area}, ${addr.city} - <strong>${addr.pincode}</strong></p>
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>

        <div class="home-location-footer-note">
          <i class="fa-solid fa-circle-info"></i>
          <span>Want to add a new address? Open your <strong>Profile > Address Book</strong>.</span>
        </div>
      </div>
    </div>
  `;

  modal.classList.remove("hidden");
}

function closeHomeLocationModal() {
  const modal = document.getElementById("home-address-modal");
  if (modal) modal.classList.add("hidden");
}

function selectHomeAddress(id) {
  setDefaultAddress(id);
  closeHomeLocationModal();
}

// Regular background ticker to auto-update order status in real time
setInterval(checkAndUpdateAutoDelivery, 30000);

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", () => {
  checkAndUpdateAutoDelivery();
  syncActiveAddressToNavbar();

  const locationPicker = document.getElementById("location-selector");
  if (locationPicker) {
    locationPicker.addEventListener("click", openHomeLocationModal);
  }
});