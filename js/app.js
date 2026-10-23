// Fyndo Main Application Logic: Product Rendering & Filters
let currentCategory = "all";
let searchQuery = "";

// 1. Render Product Cards into Grid
function renderProducts() {
  const grid = document.getElementById("products-grid");
  if (!grid) return;

  // Filter products by category and search
  const filtered = PRODUCTS.filter((product) => {
    const matchesCategory =
      currentCategory === "all" || product.category === currentCategory;
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Empty state handling
  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #64748B;">
        <i class="fa-solid fa-magnifying-glass" style="font-size: 2.5rem; margin-bottom: 12px; color: #CBD5E1;"></i>
        <h3>No products found for "${searchQuery}"</h3>
        <p>Try searching for atta, oil, maggi, or salt.</p>
      </div>
    `;
    return;
  }

  // Generate HTML for each product
  grid.innerHTML = filtered
    .map((product) => {
      const spotsLeft = product.groupRequired - product.groupJoined;
      const progressPercent = (product.groupJoined / product.groupRequired) * 100;

      return `
        <div class="product-card" data-id="${product.id}">
          <span class="product-badge">${product.badge}</span>
          
          <div class="product-image-wrap">
            <img src="${product.image}" alt="${product.name}" loading="lazy" />
          </div>

          <div class="product-details">
            <span class="product-unit">${product.unit}</span>
            <h3 class="product-name" title="${product.name}">${product.name}</h3>

            <!-- DealShare Group Buy Progress -->
            <div class="group-status-bar">
              <div class="group-status-header">
                <span><i class="fa-solid fa-users"></i> ${product.groupJoined}/${product.groupRequired} Buyers</span>
                <span>${spotsLeft} spot${spotsLeft > 1 ? "s" : ""} left</span>
              </div>
              <div class="group-progress">
                <div class="group-progress-fill" style="width: ${progressPercent}%;"></div>
              </div>
            </div>

            <div class="product-pricing-box">
              <span class="price-mrp">₹${product.mrp}</span>
              <span class="price-discount-tag">${product.discountPercent}% OFF</span>
            </div>

            <!-- Dual Action Buttons -->
            <div class="product-actions">
              <!-- Solo Buy Button -->
              <button class="btn-buy-solo" onclick="handleAddToCart('${product.id}', 'solo')">
                <span>Buy Solo</span>
                <span class="btn-price-subtext">₹${product.soloPrice}</span>
              </button>

              <!-- Group Buy Button -->
              <button class="btn-buy-group" onclick="handleAddToCart('${product.id}', 'group')">
                <span><i class="fa-solid fa-bolt"></i> Group Buy</span>
                <span class="btn-price-subtext">₹${product.groupPrice}</span>
              </button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

// 2. Setup Category Filter Tabs
function setupCategoryFilters() {
  const tabButtons = document.querySelectorAll(".category-btn");
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentCategory = btn.getAttribute("data-category");
      renderProducts();
    });
  });
}

// 3. Setup Search Bar Filter
function setupSearchFilter() {
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.trim();
      renderProducts();
    });
  }
}

// Temporary placeholder for Cart click (will build fully in Step 4)
function handleAddToCart(productId, type) {
  if (typeof addToCart === "function") {
    addToCart(productId, type);
  } else {
    alert(`Added to cart as ${type.toUpperCase()}! (Cart logic coming in Step 4)`);
  }
}

// Initialize on DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  renderProducts();
  setupCategoryFilters();
  setupSearchFilter();
});