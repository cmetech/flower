(function () {
    "use strict";
    var root = document.documentElement;
    var key = "flower-theme";
    var system = window.matchMedia("(prefers-color-scheme: dark)");
    var selected = stored() || "oscar";
    var branding = null;
    var sequence = 0;

    function stored() {
        try {
            var value = window.localStorage.getItem(key);
            return value === "light" || value === "dark" ? value : null;
        } catch (_) { return null; }
    }
    function save(value) {
        try {
            if (value === "oscar") window.localStorage.removeItem(key);
            else window.localStorage.setItem(key, value);
        } catch (_) { /* The choice still works for this tab. */ }
    }
    function color(value) {
        if (typeof value !== "string") return false;
        if (/^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/.test(value)) return true;
        var parts = /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(0(?:\.\d+)?|1(?:\.0+)?)\s*\)$/.exec(value);
        return !!parts && parts.slice(1, 4).every(function (part) { return Number(part) <= 255; });
    }
    function rgb(value, background) {
        var rgba = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/.exec(value);
        if (rgba) {
            var base = rgb(background || "#FFFFFF"), alpha = Number(rgba[4]);
            return rgba.slice(1, 4).map(function (part, index) { return Math.round(Number(part) * alpha + base[index] * (1 - alpha)); });
        }
        var hex = value.slice(1);
        if (hex.length === 3) hex = hex.split("").map(function (digit) { return digit + digit; }).join("");
        return [0, 2, 4].map(function (index) { return parseInt(hex.slice(index, index + 2), 16); });
    }
    function opaque(value, background) {
        if (value[0] === "#") return value;
        return "#" + rgb(value, background).map(function (part) { return part.toString(16).padStart(2, "0"); }).join("");
    }
    function contrast(a, b) {
        function luminance(value) {
            var channels = rgb(value).map(function (part) {
                var n = part / 255;
                return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
            });
            return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
        }
        var first = luminance(a), second = luminance(b);
        return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
    }
    function readable(background, suggestion) {
        if (suggestion && contrast(background, suggestion) >= 4.5) return suggestion;
        return contrast(background, "#242424") >= contrast(background, "#FFFFFF") ? "#242424" : "#FFFFFF";
    }
    function validMode(tokens) {
        if (!tokens || !tokens.surface || !tokens.text || !tokens.interaction || !tokens.status || !tokens.typography || !tokens.geometry) return false;
        var s = tokens.surface, t = tokens.text, i = tokens.interaction, st = tokens.status;
        var required = [s.canvas, s.paper, s.divider, t.primary, t.secondary, i.primary,
            st.success && st.success.main, st.warning && st.warning.main, st.error && st.error.main];
        var optional = [s.gridHeader, i.onPrimary, i.link, i.focus, i.controlBorder, i.selectedBg, i.selectedText,
            st.success && st.success.contrastText, st.warning && st.warning.contrastText, st.error && st.error.contrastText];
        return required.every(color) && optional.every(function (value) { return value == null || color(value); }) &&
            ["legacy", "hilda"].includes(tokens.typography.fontId) &&
            ["legacy", "hilda-mono"].includes(tokens.typography.monoFontId) &&
            Number.isFinite(tokens.typography.bodySize) && tokens.typography.bodySize >= 12 && tokens.typography.bodySize <= 24 &&
            Number.isFinite(tokens.geometry.radius) && tokens.geometry.radius >= 0 && tokens.geometry.radius <= 24;
    }
    function validResponse(value) {
        return value && value.schema_version === 1 && ["light", "dark"].includes(value.preferred_mode) &&
            value.modes && validMode(value.modes.light) && validMode(value.modes.dark);
    }
    function set(name, value) { root.style.setProperty(name, value); }
    function setColor(name, value, background) {
        set("--bs-" + name, value);
        set("--bs-" + name + "-rgb", rgb(value, background).join(", "));
    }
    function applyPalette(tokens) {
        var s = tokens.surface, t = tokens.text, i = tokens.interaction;
        var dark = root.getAttribute("data-bs-theme") === "dark";
        var body = opaque(t.primary, s.paper);
        var selectedBg = i.selectedBg || (dark ? "#4a4020" : "#fff7d2");
        var link = i.link || (dark ? i.primary : body);
        setColor("body-bg", s.canvas);
        setColor("body-color", body);
        setColor("primary", i.primary);
        setColor("link-color", link);
        set("--bs-link-hover-color", link);
        set("--bs-link-hover-color-rgb", rgb(link).join(", "));
        var focus = i.focus || link;
        set("--bs-border-color", s.divider);
        set("--bs-focus-ring-color", focus);
        set("--flower-control-border", i.controlBorder || s.divider);
        set("--flower-focus", focus);
        set("--flower-focus-rgb", rgb(focus, s.paper).join(", "));
        set("--bs-primary-bg-subtle", selectedBg);
        set("--bs-primary-border-subtle", s.divider);
        set("--flower-surface", s.paper);
        set("--flower-surface-subtle", s.gridHeader || s.canvas);
        set("--flower-navbar-bg", s.paper);
        set("--flower-text-muted", opaque(t.secondary, s.paper));
        set("--flower-accent-text", i.link || body);
        set("--flower-selected-text", i.selectedText || body);
        set("--flower-on-primary", readable(i.primary, i.onPrimary));
        set("--flower-active", link);
        [["success", "success"], ["warning", "warning"], ["danger", "error"]].forEach(function (pair) {
            var status = tokens.status[pair[1]];
            setColor(pair[0], status.main);
            set("--flower-" + pair[0], status.main);
            set("--flower-on-" + pair[0], readable(status.main, status.contrastText));
        });
        set("--bs-body-font-family", tokens.typography.fontId === "hilda" ? '"OSCAR Hilda", Arial, sans-serif' : '"Montserrat", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"');
        set("--bs-font-monospace", tokens.typography.monoFontId === "hilda-mono" ? '"OSCAR Hilda Mono", monospace' : "monospace");
        set("--bs-body-font-size", tokens.typography.bodySize + "px");
        set("--bs-border-radius", tokens.geometry.radius + "px");
        set("--flower-radius", tokens.geometry.radius + "px");
    }
    function mode() { return selected === "oscar" ? (branding ? branding.preferred_mode : (system.matches ? "dark" : "light")) : selected; }
    function updateMenu() {
        var toggle = document.getElementById("theme-toggle");
        var label = document.getElementById("theme-toggle-label");
        var icon = document.getElementById("theme-toggle-icon");
        if (!toggle || !label || !icon) return;
        var name = selected === "oscar" ? "OSCAR" : selected.charAt(0).toUpperCase() + selected.slice(1);
        label.textContent = "Select theme: " + name;
        toggle.setAttribute("aria-label", "Select theme, current setting: " + name);
        icon.setAttribute("href", "#theme-icon-" + selected);
        document.querySelectorAll("[data-bs-theme-value]").forEach(function (option) {
            var active = option.getAttribute("data-bs-theme-value") === selected;
            option.classList.toggle("active", active);
            option.setAttribute("aria-pressed", active ? "true" : "false");
        });
    }
    function apply() {
        var active = mode();
        root.setAttribute("data-bs-theme", active);
        if (branding) applyPalette(branding.modes[active]);
        updateMenu();
    }
    function refresh() {
        var current = ++sequence;
        fetch("/api/branding/flower/", { credentials: "same-origin", cache: "no-store" })
            .then(function (response) { if (!response.ok) throw new Error("unavailable"); return response.json(); })
            .then(function (value) {
                if (current !== sequence || !validResponse(value)) return;
                branding = value;
                apply();
            }).catch(function () { /* Keep the last valid palette or packaged fallback. */ });
    }
    apply();
    refresh();
    document.addEventListener("DOMContentLoaded", function () {
        updateMenu();
        document.querySelectorAll("[data-bs-theme-value]").forEach(function (option) {
            option.addEventListener("click", function () {
                selected = option.getAttribute("data-bs-theme-value");
                save(selected);
                apply();
            });
        });
    });
    window.addEventListener("focus", refresh);
    system.addEventListener("change", function () { if (selected === "oscar" && !branding) apply(); });
}());
