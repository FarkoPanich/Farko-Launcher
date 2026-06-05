(() => {
  "use strict";

  const CONFIG = {
    masterListUrl: "https://raw.githubusercontent.com/FarkoPanich/Masterlist/main/servers.json",
    discordInvite: "https://discord.com/invite/VaB6zdEFBy",
    downloadUrl: "https://github.com/FarkoPanich/Farko-Launcher/releases/download/v1.0.0/FarkoLauncher-Setup.exe",
    downloadFileName: "FarkoLauncher-Setup.exe",
    backgrounds: {
      hero: "img/1.png",
      list: "img/2.png",
      community: "img/3.png",
      stats: "img/4.png",
      masterlist: "img/5.png",
    },
  };

  const TABS = ["overview", "masterlist"];
  const TOAST_DURATION_MS = 2200;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => root.querySelectorAll(selector);

  const state = {
    masterServers: [],
    fetching: false,
    toastTimer: null,
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function flagSrc(lang) {
    const code = String(lang || "xx").toLowerCase().trim();
    return `img/flags/${code}.png`;
  }

  function showToast(message) {
    const toast = $("#toast");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => toast.classList.remove("show"), TOAST_DURATION_MS);
  }

  function parseGamemode(gamemode) {
    const first = String(gamemode || "—").split(/[,|/]/)[0].trim();
    return first || "—";
  }

  function sortServers(servers) {
    return [...servers].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
    );
  }

  function renderServerRows(servers) {
    if (!servers.length) {
      return '<div class="empty-state"><p>No servers yet.</p></div>';
    }

    return servers
      .map((server) => {
        const name = escapeHtml(server.name || "Unknown");
        const mode = escapeHtml(parseGamemode(server.gamemode));
        const lang = String(server.lang || "xx").toLowerCase();

        return `
        <div class="server-row">
          <div class="row-name">
            <img
              class="row-flag"
              src="${flagSrc(lang)}"
              alt=""
              width="28"
              height="19"
              loading="lazy"
              onerror="this.style.display='none'"
            />
            <span class="name">${name}</span>
          </div>
          <div class="row-mode">${mode}</div>
        </div>`;
      })
      .join("");
  }

  function updateServerCount(count) {
    const text = String(count);
    const statList = $("#statServersList");
    const masterCount = $("#masterCount");

    if (statList) statList.textContent = text;
    if (masterCount) {
      masterCount.innerHTML =
        `<span class="list-count-num">${text}</span><span class="list-count-label">Servers</span>`;
    }
  }

  function clearServerCount() {
    const dash = "—";
    const statList = $("#statServersList");
    const masterCount = $("#masterCount");

    if (statList) statList.textContent = dash;
    if (masterCount) masterCount.textContent = dash;
  }

  function filterMasterList(query) {
    const normalized = query.trim().toLowerCase();
    let visible = 0;

    $$(".server-row").forEach((row) => {
      const match = !normalized || row.textContent.toLowerCase().includes(normalized);
      row.classList.toggle("hidden", !match);
      if (match) visible += 1;
    });

    const emptyState = $("#masterListEmpty");
    if (emptyState) emptyState.hidden = visible > 0 || !normalized;
  }

  async function loadMasterList(force = false) {
    const table = $("#masterTableWrap");
    const search = $("#masterSearch");

    if (!table || state.fetching) return;

    state.fetching = true;

    if (force || !table.dataset.loaded) {
      table.innerHTML =
        '<div class="empty-state"><div class="loader"></div><p>Loading servers…</p></div>';
    }

    try {
      const response = await fetch(CONFIG.masterListUrl, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      state.masterServers = sortServers(Array.isArray(data.servers) ? data.servers : []);

      table.innerHTML = renderServerRows(state.masterServers);
      table.dataset.loaded = "1";

      if (search?.value) filterMasterList(search.value);
      updateServerCount(state.masterServers.length);
    } catch (error) {
      table.innerHTML =
        `<div class="empty-state"><p>Failed to load — ${escapeHtml(error.message)}</p></div>`;
      clearServerCount();
    } finally {
      state.fetching = false;
    }
  }

  function loadBackground(element, url) {
    if (!element || !url || element.dataset.bgLoaded) return;

    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      element.style.backgroundImage = `url("${url}")`;
      element.dataset.bgLoaded = "1";
    };
    image.src = url;
  }

  function setActiveTab(tabId) {
    $$(".nav-link").forEach((link) => {
      link.classList.toggle("active", link.dataset.tab === tabId);
    });

    $$(".page").forEach((page) => {
      page.classList.toggle("active", page.id === `panel-${tabId}`);
    });

    document.body.classList.toggle("is-overview", tabId === "overview");
    document.body.classList.toggle("is-masterlist", tabId === "masterlist");

    $("#navLinks")?.classList.remove("open");
    $("#navToggle")?.setAttribute("aria-expanded", "false");

    location.hash = tabId;

    const overview = $("#panel-overview");
    if (tabId === "overview") {
      overview?.scrollTo({ top: 0, behavior: "instant" });
    } else {
      window.scrollTo(0, 0);
    }

    if (tabId === "masterlist") {
      loadBackground($(".masterlist-scene-bg"), CONFIG.backgrounds.masterlist);
      loadMasterList(false);
    }
  }

  function initTabs() {
    $$(".nav-link[data-tab]").forEach((button) => {
      button.addEventListener("click", () => setActiveTab(button.dataset.tab));
    });

    $$("[data-goto]").forEach((element) => {
      element.addEventListener("click", (event) => {
        event.preventDefault();
        setActiveTab(element.dataset.goto);
      });
    });

    const hash = (location.hash || "#overview").replace("#", "");
    setActiveTab(TABS.includes(hash) ? hash : "overview");

    window.addEventListener("hashchange", () => {
      const id = (location.hash || "#overview").replace("#", "");
      if (TABS.includes(id)) setActiveTab(id);
    });
  }

  function initNav() {
    const nav = $(".nav");
    const toggle = $("#navToggle");
    const links = $("#navLinks");
    const overview = $("#panel-overview");

    const updateScrolled = () => {
      const onOverview = document.body.classList.contains("is-overview");
      const offset = onOverview ? overview?.scrollTop ?? 0 : window.scrollY;
      nav?.classList.toggle("scrolled", offset > 24);
    };

    window.addEventListener("scroll", updateScrolled, { passive: true });
    overview?.addEventListener("scroll", updateScrolled, { passive: true });

    toggle?.addEventListener("click", () => {
      const isOpen = links?.classList.toggle("open");
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    document.addEventListener("click", (event) => {
      if (!links?.classList.contains("open")) return;
      if (event.target.closest(".nav-inner")) return;
      links.classList.remove("open");
      toggle?.setAttribute("aria-expanded", "false");
    });
  }

  function initDownloadLinks() {
    const url = CONFIG.downloadUrl.trim();
    const fileName = CONFIG.downloadFileName;

    $$("[data-download]").forEach((link) => {
      if (!url) {
        link.href = "#";
        link.setAttribute("aria-disabled", "true");
        link.addEventListener("click", (event) => {
          event.preventDefault();
          showToast("Download is not available yet.");
        });
        return;
      }

      link.href = url;
      link.setAttribute("download", fileName);
      link.removeAttribute("target");
      link.removeAttribute("aria-disabled");
    });
  }

  function initExternalLinks() {
    $$("[data-discord]").forEach((link) => {
      link.href = CONFIG.discordInvite;
    });
    initDownloadLinks();
  }

  function initLazyBackgrounds() {
    loadBackground($("#heroParallax"), CONFIG.backgrounds.hero);

    const scroller = $("#panel-overview");
    const chapters = [
      { id: "chapter-list", url: CONFIG.backgrounds.list },
      { id: "chapter-community", url: CONFIG.backgrounds.community },
      { id: "chapter-stats", url: CONFIG.backgrounds.stats },
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const background = entry.target.querySelector(".chapter-scene-bg");
          if (background) loadBackground(background, background.dataset.bg);
          observer.unobserve(entry.target);
        });
      },
      { root: scroller, rootMargin: "700px 0px", threshold: 0.01 }
    );

    chapters.forEach(({ id, url }) => {
      const chapter = document.getElementById(id);
      const background = chapter?.querySelector(".chapter-scene-bg");
      if (!chapter || !background) return;
      background.dataset.bg = url;
      observer.observe(chapter);
    });
  }

  function initScrollExperience() {
    const scroller = $("#panel-overview");
    const chapters = $$(".scroll-chapter");
    const dots = $$(".scroll-nav-dot");
    const heroBackground = $("#heroParallax");

    if (!scroller || !chapters.length) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const updateHints = (activeId) => {
      chapters.forEach((chapter) => {
        const isActive = chapter.id === activeId;
        const hintDown = chapter.querySelector(".scroll-hint--down");
        const hintUp = chapter.querySelector(".scroll-hint--up");

        hintDown?.classList.toggle("is-hidden", !isActive || chapter.id === "chapter-stats");
        hintUp?.classList.toggle("is-hidden", !isActive || chapter.id === "chapter-hero");
      });
    };

    const chapterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("is-visible");
          const chapterId = entry.target.id;

          dots.forEach((dot) => {
            dot.classList.toggle("is-active", dot.dataset.chapter === chapterId);
          });

          updateHints(chapterId);
        });
      },
      { root: scroller, threshold: 0.55 }
    );

    chapters.forEach((chapter) => chapterObserver.observe(chapter));
    $("#chapter-hero")?.classList.add("is-visible");
    updateHints("chapter-hero");

    dots.forEach((dot) => {
      dot.addEventListener("click", () => {
        const target = document.getElementById(dot.dataset.chapter);
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    scroller.addEventListener(
      "scroll",
      () => {
        if (prefersReducedMotion || !heroBackground) return;

        const hero = $("#chapter-hero");
        if (!hero) return;

        const progress = Math.min(1, scroller.scrollTop / (hero.offsetHeight * 0.75));
        const translateY = progress * 72;
        const scale = 1 + progress * 0.05;
        heroBackground.style.transform = `translate3d(0, ${translateY}px, 0) scale(${scale})`;
      },
      { passive: true }
    );
  }

  function initPreview3D() {
    const stage = $("#previewStage");
    const card = $("#preview3d");
    if (!stage || !card) return;

    const baseRotateY = 5;
    const baseRotateX = 2;

    const applyTransform = (rotateY, rotateX) => {
      card.style.transform = `rotateY(${rotateY}deg) rotateX(${rotateX}deg)`;
    };

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.matchMedia("(max-width: 960px)").matches;

    applyTransform(baseRotateY, baseRotateX);

    if (prefersReducedMotion || isMobile) return;

    stage.addEventListener("mousemove", (event) => {
      const rect = stage.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      applyTransform(baseRotateY + x * 16, baseRotateX - y * 12);
    });

    stage.addEventListener("mouseleave", () => {
      applyTransform(baseRotateY, baseRotateX);
    });
  }

  function initMasterListSearch() {
    $("#masterSearch")?.addEventListener("input", (event) => {
      filterMasterList(event.target.value);
    });
  }

  function init() {
    initExternalLinks();
    initNav();
    initTabs();
    initLazyBackgrounds();
    initScrollExperience();
    initPreview3D();
    initMasterListSearch();
    loadMasterList(false);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
