// Quantum Build front-end logic
document.addEventListener("DOMContentLoaded", function () {
  const CART_KEY = "quantumBuildCart";
  // Check if products are already loaded from products.js
  let products = window.products || [];

  const API_BASE_URL = "";

  // DOM Elements
  const productsSection = document.getElementById("productsSection");
  const productList = document.getElementById("productList");
  const sortSelect = document.getElementById("sortSelect");
  const filterChips = Array.from(document.querySelectorAll(".filter-chip"));
  const searchInput = document.getElementById("searchInput");
  const searchClear = document.getElementById("searchClear");
  const cartCountEl = document.getElementById("cartCount");
  const cartBtn = document.getElementById("cartButton");
  const scrollBtn = document.getElementById("scrollToProducts");

  // AI Builder Elements
  const aiBuilderBtn = document.getElementById("aiBuilderBtn");
  const heroAiBtn = document.getElementById("heroAiBtn");
  const aiSection = document.getElementById("aiSection");
  const budgetRange = document.getElementById("budgetRange");
  const budgetDisplay = document.getElementById("budgetDisplay");
  const generateBuildBtn = document.getElementById("generateBuildBtn");
  const aiResults = document.getElementById("aiResults");
  const aiBuildList = document.getElementById("aiBuildList");
  const aiTotalCost = document.getElementById("aiTotalCost");
  const addAllToCartBtn = document.getElementById("addAllToCartBtn");
  const aiChips = Array.from(document.querySelectorAll(".ai-chip"));

  // Modal Elements
  const modalBackdrop = document.getElementById("productModal");
  const modalClose = document.getElementById("modalClose");
  const modalImage = document.getElementById("modalImage");
  const modalBadge = document.getElementById("modalBadge");
  const modalTitle = document.getElementById("modalTitle");
  const modalPrice = document.getElementById("modalPrice");
  const modalSpecs = document.getElementById("modalSpecs");
  const modalDesc = document.getElementById("modalDesc");
  const modalUsage = document.getElementById("modalUsage");
  const modalAddBtn = document.getElementById("modalAddBtn");

  // Build Summary Bar
  const buildSummaryCount = document.getElementById("buildSummaryCount");
  const buildSummaryTotal = document.getElementById("buildSummaryTotal");
  const buildSummaryView = document.getElementById("buildSummaryView");
  const buildSummaryClear = document.getElementById("buildSummaryClear");

  // State
  let currentCategory = "all";
  let currentSort = "default";
  let currentSearch = "";
  let currentAiUsage = "gaming";

  /* ---------- API Fetch ---------- */
  async function fetchProducts() {
    // If we already have products from products.js, render them immediately
    if (products.length > 0) {
      renderProducts();
    }

    try {
      // Attempt to fetch from API if URL is configured
      if (API_BASE_URL) {
        const res = await fetch(`${API_BASE_URL}/api/products`);
        if (res.ok) {
          products = await res.json();
          renderProducts();
        }
      }
    } catch (err) {
      console.warn("API fetch failed, using local data if available.", err);
      // Fallback is already handled by initial check
    }

    if (products.length === 0 && productList) {
      productList.innerHTML = "<p>No products found.</p>";
    }
  }

  /* ---------- Cart Logic ---------- */

  function loadCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartUI();
  }

  function addToCart(product) {
    const cart = loadCart();
    const existing = cart.find(p => p.id === product.id);
    if (existing) {
      existing.qty = (existing.qty || 1) + 1;
    } else {
      cart.push({ ...product, qty: 1 });
    }
    saveCart(cart);

    // Simple feedback
    const btn = document.querySelector(`button[data-id="${product.id}"]`);
    if (btn) {
      const originalText = btn.innerHTML;
      btn.innerHTML = "✓";
      setTimeout(() => btn.innerHTML = originalText, 1000);
    }
  }

  function updateCartUI() {
    const cart = loadCart();
    const count = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
    const total = cart.reduce((sum, item) => sum + (item.price * (item.qty || 1)), 0);

    if (cartCountEl) cartCountEl.textContent = count;

    if (buildSummaryCount) buildSummaryCount.textContent = `${count} items selected`;
    if (buildSummaryTotal) buildSummaryTotal.textContent = `₹${total.toLocaleString("en-IN")}`;

    const summaryBar = document.querySelector(".build-summary-bar");
    if (summaryBar) {
      summaryBar.style.display = count > 0 ? "flex" : "none";
    }
  }

  /* ---------- Product Rendering ---------- */

  function renderProducts() {
    if (!productList) return;
    productList.innerHTML = "";

    let filtered = products.filter(p => {
      const matchCat = currentCategory === "all" || p.category === currentCategory;
      const matchSearch = p.name.toLowerCase().includes(currentSearch) ||
        p.category.includes(currentSearch);
      return matchCat && matchSearch;
    });

    // Sort
    if (currentSort === "price-asc") filtered.sort((a, b) => a.price - b.price);
    if (currentSort === "price-desc") filtered.sort((a, b) => b.price - a.price);
    if (currentSort === "name-asc") filtered.sort((a, b) => a.name.localeCompare(b.name));

    filtered.forEach(p => {
      const card = document.createElement("article");
      card.className = "product-card";
      card.dataset.id = p.id;
      card.innerHTML = `
        <div class="product-image-wrap">
          <img src="${p.image}" alt="${p.name}" class="product-image">
          <div class="product-badge">${p.badge}</div>
          <div class="product-category-pill">${p.category}</div>
        </div>
        <h3 class="product-title">${p.name}</h3>
        <p class="product-meta">${p.specs}</p>
        <p class="product-usage">${p.usage}</p>
        <div class="product-bottom">
          <div class="product-price-block">
            <span class="product-price-main">₹${p.price.toLocaleString("en-IN")}</span>
          </div>
          <button class="add-btn" data-id="${p.id}">
            <span class="icon">＋</span>
          </button>
        </div>
      `;

      // Card click -> Open Modal
      card.addEventListener("click", (e) => {
        if (!e.target.closest(".add-btn")) {
          openModal(p);
        }
      });

      // Add btn click -> Add to cart
      const addBtn = card.querySelector(".add-btn");
      addBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        addToCart(p);
      });

      productList.appendChild(card);
    });
  }

  /* ---------- Modal Logic ---------- */

  function openModal(product) {
    if (!modalBackdrop) return;
    modalImage.src = product.image;
    modalBadge.textContent = product.badge;
    modalTitle.textContent = product.name;
    modalPrice.textContent = `₹${product.price.toLocaleString("en-IN")}`;
    modalSpecs.textContent = product.specs;
    modalDesc.textContent = product.description;
    modalUsage.textContent = `Best for: ${product.usage}`;

    modalAddBtn.onclick = () => {
      addToCart(product);
      modalBackdrop.classList.remove("active");
    };

    modalBackdrop.classList.add("active");
  }

  if (modalClose) {
    modalClose.addEventListener("click", () => {
      modalBackdrop.classList.remove("active");
    });
  }

  if (modalBackdrop) {
    modalBackdrop.addEventListener("click", (e) => {
      if (e.target === modalBackdrop) {
        modalBackdrop.classList.remove("active");
      }
    });
  }

  /* ---------- Filters & Sort ---------- */

  filterChips.forEach(chip => {
    chip.addEventListener("click", () => {
      filterChips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      currentCategory = chip.dataset.category;
      renderProducts();
    });
  });

  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      currentSort = sortSelect.value;
      renderProducts();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      currentSearch = e.target.value.toLowerCase();
      if (searchClear) searchClear.style.display = currentSearch ? "block" : "none";
      renderProducts();
    });
  }

  if (searchClear) {
    searchClear.addEventListener("click", () => {
      searchInput.value = "";
      currentSearch = "";
      searchClear.style.display = "none";
      renderProducts();
    });
  }

  /* ---------- AI Builder Logic ---------- */

  function toggleAiBuilder() {
    if (!aiSection) return;
    if (aiSection.style.display === "none") {
      aiSection.style.display = "block";
      aiSection.scrollIntoView({ behavior: "smooth" });
    } else {
      aiSection.style.display = "none";
    }
  }

  if (aiBuilderBtn) aiBuilderBtn.addEventListener("click", toggleAiBuilder);
  if (heroAiBtn) heroAiBtn.addEventListener("click", toggleAiBuilder);

  if (budgetRange) {
    budgetRange.addEventListener("input", (e) => {
      budgetDisplay.textContent = parseInt(e.target.value).toLocaleString("en-IN");
    });
  }

  aiChips.forEach(chip => {
    chip.addEventListener("click", () => {
      aiChips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      currentAiUsage = chip.dataset.usage;
    });
  });

  if (generateBuildBtn) {
    generateBuildBtn.addEventListener("click", async () => {
      const budget = parseInt(budgetRange.value);
      const usage = currentAiUsage;

      // Use Backend API for AI Build
      try {
        const res = await fetch(`${API_BASE_URL}/api/ai-build`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ budget, usage })
        });

        if (!res.ok) throw new Error("AI Build failed");

        const data = await res.json();
        const suggested = data.build;
        const total = data.total;

        // Render Results
        aiBuildList.innerHTML = "";

        if (suggested.length < 3) {
          aiBuildList.innerHTML = "<p>Budget too low for a complete build. Try increasing it.</p>";
          aiTotalCost.textContent = "₹0";
          addAllToCartBtn.style.display = "none";
          aiResults.style.display = "block";
          return;
        }

        suggested.forEach(p => {
          const item = document.createElement("div");
          item.className = "ai-build-item";
          item.innerHTML = `
            <span><strong>${p.category.toUpperCase()}</strong>: ${p.name}</span>
            <span>₹${p.price.toLocaleString("en-IN")}</span>
          `;
          aiBuildList.appendChild(item);
        });

        aiTotalCost.textContent = `₹${total.toLocaleString("en-IN")}`;
        addAllToCartBtn.style.display = "block";
        aiResults.style.display = "block";

        // Add All Handler
        addAllToCartBtn.onclick = () => {
          suggested.forEach(p => addToCart(p));
          alert("All suggested parts added to cart!");
        };

      } catch (err) {
        console.error(err);
        alert("Failed to generate build. Please try again.");
      }
    });
  }

  /* ---------- Init ---------- */

  if (scrollBtn) {
    scrollBtn.addEventListener("click", () => {
      productsSection.scrollIntoView({ behavior: "smooth" });
    });
  }

  if (cartBtn) {
    cartBtn.addEventListener("click", () => {
      window.location.href = "cart.html";
    });
  }

  if (buildSummaryView) {
    buildSummaryView.addEventListener("click", () => {
      window.location.href = "cart.html";
    });
  }

  if (buildSummaryClear) {
    buildSummaryClear.addEventListener("click", () => {
      if (confirm("Clear selection?")) {
        saveCart([]);
      }
    });
  }

  // Initial Fetch
  fetchProducts();
  updateCartUI();
});
