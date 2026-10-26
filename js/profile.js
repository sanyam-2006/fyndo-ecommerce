// ===================================================================
// FYNDO USER PROFILE, ADDRESS BOOK, AUTO-DELIVERY & LIVE LOCATION
// ===================================================================

const ADDRESS_STORAGE_KEY = "fyndo_addresses_v1";
const ORDERS_STORAGE_KEY = "fyndo_orders_v1";
const LOCATION_STORAGE_KEY = "fyndo_detected_location_v1";

// 1. Saved Addresses (Empty by default for new visitors; populates when user saves an address)
let savedAddresses = JSON.parse(localStorage.getItem(ADDRESS_STORAGE_KEY)) || [];

// 2. Orders List (Empty by default for new visitors; populates when user places live orders)
let userOrdersList = JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY)) || [];

// 3. Detected Live Location State
let detectedLocation = JSON.parse(localStorage.getItem(LOCATION_STORAGE_KEY)) || {
  city: "Detecting Location...",
  pincode: "",
  fullText: "Detecting Location..."
};

function saveAddresses() {
  localStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(savedAddresses));
  syncActiveAddressToNavbar();
}

function saveOrders() {
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(userOrdersList));
}

// ===================================================================
// LIVE GEOLOCATION & REVERSE GEOCODING
// Automatically detects current visitor's real live city & pincode
// ===================================================================
async function detectUserLiveLocation(forcePrompt = false) {
  const navCity = document.getElementById("current-city");
  const def = getDefaultAddress();

  // If user already has a saved personal address, use that in navbar unless they force GPS refresh
  if (def && !forcePrompt) {
    if (navCity) navCity.innerText = `${def.city}, ${def.pincode}`;
    return;
  }

  if (navCity && (!detectedLocation.pincode || forcePrompt)) {
    navCity.innerText = "Locating...";
  }

  if (!navigator.geolocation) {
    applyFallbackLocation("Select Location", "");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const locData = await reverseGeocodeCoordinates(lat, lon);
        
        detectedLocation = {
          city: locData.city,
          pincode: locData.pincode,
          fullText: locData.pincode ? `${locData.city}, ${locData.pincode}` : locData.city
        };
        localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(detectedLocation));

        // Update navbar if user hasn't set a personal address yet
        if (!def || forcePrompt) {
          if (navCity) navCity.innerText = detectedLocation.fullText;
        }

        if (forcePrompt) {
          showToastNotification(`📍 Location detected: ${detectedLocation.fullText}`);
          const homeModal = document.getElementById("home-address-modal");
          if (homeModal && !homeModal.classList.contains("hidden")) {
            openHomeLocationModal();
          }
        }
      } catch (err) {
        console.warn("Geocoding failed:", err);
        applyFallbackLocation("Select Location", "");
      }
    },
    (err) => {
      console.warn("Geolocation denied or error:", err.message);
      if (!def && navCity) {
        navCity.innerText = detectedLocation.pincode ? detectedLocation.fullText : "Select Location";
      }
    },
    { timeout: 10000, enableHighAccuracy: false }
  );
}

// Reverse Geocoding with reliable free APIs
async function reverseGeocodeCoordinates(lat, lon) {
  // 1. Try BigDataCloud Client API (fast, free, CORS-friendly)
  try {
    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
    if (res.ok) {
      const data = await res.json();
      const city = data.city || data.locality || data.principalSubdivision || "Current Location";
      const pincode = data.postcode || "";
      return { city, pincode };
    }
  } catch (e) {}

  // 2. Fallback to OpenStreetMap Nominatim
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const city = addr.city || addr.town || addr.village || addr.suburb || addr.county || "Current Location";
      const pincode = addr.postcode || "";
      return { city, pincode };
    }
  } catch (e) {}

  return { city: "Current Location", pincode: "" };
}

function applyFallbackLocation(city, pin) {
  detectedLocation = { city, pincode: pin, fullText: pin ? `${city}, ${pin}` : city };
  const navCity = document.getElementById("current-city");
  const def = getDefaultAddress();
  if (!def && navCity) navCity.innerText = detectedLocation.fullText;
}

// ===================================================================
// AUTO-DELIVERY REAL-TIME CHECKER
// ===================================================================
function checkAndUpdateAutoDelivery() {
  const currentTime = Date.now();
  let hasUpdates = false;

  userOrdersList.forEach((order) => {
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

// Test Helper: Allows instantly marking an order as Delivered
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

// 4. Open & Close Profile Dashboard
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

function switchProfileTab(tab) {
  currentProfileTab = tab;
  document.querySelectorAll(".profile-nav-item").forEach((el) => {
    el.classList.remove("active");
  });
  const activeNavItem = document.getElementById(`pnav-${tab}`);
  if (activeNavItem) activeNavItem.classList.add("active");

  renderProfileContent();
}

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

// --- TAB 2: ADDRESS BOOK (Clean Empty State for New Visitors) ---
function renderAddressBookTab(container) {
  const currentCity = (detectedLocation.city && detectedLocation.city !== "Detecting Location...") ? detectedLocation.city : "";

  container.innerHTML = `
    <div class="profile-content-header address-header-flex">
      <div>
        <h2><i class="fa-solid fa-map-location-dot"></i> Saved Addresses</h2>
        <p>Manage your delivery locations for fast 2-hour grocery delivery.</p>
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
            <label><i class="fa-solid fa-user"></i> Full Name *</label>
            <input type="text" id="naddr-name" placeholder="Receiver's full name" required />
          </div>
          <div class="form-group">
            <label><i class="fa-solid fa-phone"></i> Phone Number *</label>
            <input type="tel" id="naddr-phone" placeholder="10-digit mobile number" required pattern="[0-9]{10}" />
          </div>
        </div>

        <div class="form-group">
          <label><i class="fa-solid fa-house"></i> House / Flat / Building No. *</label>
          <input type="text" id="naddr-house" placeholder="Flat No., House No., Building Name" required />
        </div>

        <div class="form-group">
          <label><i class="fa-solid fa-road"></i> Street / Colony / Landmark *</label>
          <input type="text" id="naddr-area" placeholder="Street, Colony, Area or Landmark" required />
        </div>

        <div class="form-grid-3">
          <div class="form-group">
            <label><i class="fa-solid fa-city"></i> City *</label>
            <input type="text" id="naddr-city" value="${currentCity}" placeholder="City" required />
          </div>
          <div class="form-group">
            <label><i class="fa-solid fa-map-pin"></i> Pincode *</label>
            <input type="text" id="naddr-pin" value="${detectedLocation.pincode || ''}" placeholder="6-digit Pincode" required pattern="[0-9]{6}" />
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

    <!-- Saved Address Cards or Empty State -->
    ${
      savedAddresses.length === 0
        ? `
        <div class="empty-orders-state">
          <i class="fa-solid fa-map-location-dot"></i>
          <h3>No Saved Addresses Yet</h3>
          <p>Add your home or office address to enable quick 2-hour grocery delivery.</p>
          <button class="btn-primary-large" onclick="toggleAddAddressForm(true, 'add')">
            <i class="fa-solid fa-plus"></i> Add Delivery Address
          </button>
        </div>
        `
        : `
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
                  <p class="addr-city-text">${addr.city}, ${addr.state || ""} - <strong>${addr.pincode}</strong></p>

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
        `
    }
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

      // Clear all fields for new input, prefilling city/pin from live location if available
      document.getElementById("naddr-edit-id").value = "";
      document.getElementById("naddr-name").value = "";
      document.getElementById("naddr-phone").value = "";
      document.getElementById("naddr-house").value = "";
      document.getElementById("naddr-area").value = "";
      document.getElementById("naddr-city").value = (detectedLocation.city && detectedLocation.city !== "Detecting Location...") ? detectedLocation.city : "";
      document.getElementById("naddr-pin").value = detectedLocation.pincode || "";
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
  document.getElementById("naddr-city").value = target.city || "";
  document.getElementById("naddr-pin").value = target.pincode || "";
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
  const city = document.getElementById("naddr-city").value.trim();
  const pin = document.getElementById("naddr-pin").value.trim();
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
  if (confirm("Delete this address from your address book?")) {
    savedAddresses = savedAddresses.filter((a) => a.id !== id);
    if (savedAddresses.length > 0 && !savedAddresses.some((a) => a.isDefault)) {
      savedAddresses[0].isDefault = true;
    }
    saveAddresses();
    renderProfileContent();
    showToastNotification("Address removed.");
  }
}

function getDefaultAddress() {
  if (!savedAddresses || savedAddresses.length === 0) return null;
  return savedAddresses.find((a) => a.isDefault) || savedAddresses[0];
}

function syncActiveAddressToNavbar() {
  const def = getDefaultAddress();
  const navCity = document.getElementById("current-city");
  
  if (def && navCity) {
    // OLD USER: Display saved default address
    navCity.innerText = `${def.city}, ${def.pincode}`;
  } else if (navCity) {
    // NEW USER: Display detected live location
    if (detectedLocation && detectedLocation.pincode) {
      navCity.innerText = detectedLocation.fullText;
    } else {
      detectUserLiveLocation();
    }
  }
}

// --- TAB 3: RATE FYNDO ---
let selectedRating = 5;

function renderRateFyndoTab(container) {
  const cityText = detectedLocation.city && detectedLocation.city !== "Detecting Location..." ? detectedLocation.city : "your city";

  container.innerHTML = `
    <div class="profile-content-header">
      <h2><i class="fa-solid fa-star"></i> Rate Your Fyndo Experience</h2>
      <p>Help us improve our community grocery and wholesale group buying service in ${cityText}.</p>
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
        <label>Your Feedback / Suggestions for ${cityText} Hub</label>
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
// HOME PAGE LOCATION SELECTOR MODAL
// ===================================================================
function openHomeLocationModal() {
  const modal = document.getElementById("home-address-modal");
  if (!modal) return;

  const hasSaved = savedAddresses && savedAddresses.length > 0;

  modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <h3><i class="fa-solid fa-location-dot"></i> Select Delivery Location</h3>
        <button class="btn-close-modal" onclick="closeHomeLocationModal()"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div class="modal-body">
        <!-- Live GPS Detect Option -->
        <div style="background: #F0FDF4; border: 1.5px solid #BBF7D0; border-radius: var(--radius-sm); padding: 12px 16px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fa-solid fa-crosshairs" style="color: #16A34A; font-size: 1.2rem;"></i>
            <div>
              <strong style="color: #166534; font-size: 0.95rem;">Live Current Location</strong>
              <p style="margin: 0; font-size: 0.82rem; color: #4B5563;">${detectedLocation.fullText || "Detecting..."}</p>
            </div>
          </div>
          <button class="btn-primary-large" style="padding: 6px 12px; font-size: 0.82rem;" onclick="detectUserLiveLocation(true)">
            Detect GPS
          </button>
        </div>

        ${
          hasSaved
            ? `
            <p class="home-location-subtext">Or choose from your saved addresses:</p>
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
            `
            : `
            <div style="text-align: center; padding: 20px 10px;">
              <p style="color: #64748B; font-size: 0.9rem; margin-bottom: 12px;">You haven't saved any addresses yet.</p>
              <button class="btn-proceed-checkout" style="width: auto; padding: 10px 18px; margin: 0 auto;" onclick="closeHomeLocationModal(); openProfilePage('address');">
                <i class="fa-solid fa-plus"></i> Add Delivery Address in Profile
              </button>
            </div>
            `
        }

        <div class="home-location-footer-note">
          <i class="fa-solid fa-circle-info"></i>
          <span>Want to add or manage addresses? Open your <strong>Profile > Address Book</strong>.</span>
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

// Background auto-delivery ticker
setInterval(checkAndUpdateAutoDelivery, 30000);

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", () => {
  detectUserLiveLocation();
  checkAndUpdateAutoDelivery();
  syncActiveAddressToNavbar();

  const locationPicker = document.getElementById("location-selector");
  if (locationPicker) {
    locationPicker.addEventListener("click", openHomeLocationModal);
  }
});