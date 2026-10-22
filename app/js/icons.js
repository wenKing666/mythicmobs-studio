/* 统一图标：24 视框、描边 1.7、无填充，颜色跟随 currentColor */
window.MM_ICONS = (function () {
  "use strict";

  const P = {
    plus: "M12 5v14M5 12h14",
    x: "M6 6l12 12M18 6L6 18",
    chevron: "M6 9l6 6 6-6",
    download: "M12 4v11m0 0l-4-4m4 4l4-4M4 20h16",
    copy: "M9 9h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zM5 15V5a1 1 0 0 1 1-1h9",
    trash: "M4 6.5h16M9.5 6.5V4.6h5v1.9M6.4 6.5l.8 13.1c.05.75.66 1.3 1.4 1.3h6.8c.74 0 1.35-.55 1.4-1.3l.8-13.1",
    help: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.6 9.2a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.2 1-1.2 1.8v.4M12 17h.01",
    skull: "M12 3.4c-4.4 0-7.6 3-7.6 7 0 2.3 1 4 2.5 5.1l.3 3.3c.05.7.65 1.2 1.35 1.2h6.9c.7 0 1.3-.5 1.35-1.2l.3-3.3c1.5-1.1 2.5-2.8 2.5-5.1 0-4-3.2-7-7.6-7zM12 13.2v1.9",
    sword: "M14.6 17.6L3 6V3h3l11.6 11.6M13 19l6-6M15.8 15.8l4.2 4.2M18.6 20.9l2.3-2.3",
    crown: "M3.5 19h17M4.2 19L3 8.6l5.1 3.9L12 5.4l3.9 7.1L21 8.6 19.8 19",
    shield: "M12 3l8 3v5.8c0 4.9-3.5 7.9-8 9.2-4.5-1.3-8-4.3-8-9.2V6z",
    box: "M12 3.2l8 4.3v9L12 20.8l-8-4.3v-9zM4 7.5l8 4.4 8-4.4M12 11.9v8.9",
    zap: "M13.4 2.5L4.8 13.6H11l-.4 7.9 8.6-11.1H13z",
    sliders: "M4 7h6.6M15.4 7H20M4 12h3.6M12.4 12H20M4 17h8.6M17.4 17H20",
    file: "M13.5 3H7a1.6 1.6 0 0 0-1.6 1.6v14.8A1.6 1.6 0 0 0 7 21h10a1.6 1.6 0 0 0 1.6-1.6V8.1zM13.4 3.2v5h5M9 13h6M9 16.6h4",
    text: "M4 6.5h16M4 11h16M4 15.5h11",
    sparkle: "M12 3.6l1.7 4.7 4.7 1.7-4.7 1.7L12 16.4l-1.7-4.7L5.6 10l4.7-1.7zM18.4 15.6l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z",
    layers: "M12 3.4l8.4 4.3-8.4 4.3-8.4-4.3zM3.6 12.2L12 16.5l8.4-4.3M3.6 16.4L12 20.7l8.4-4.3"
  };

  const EXTRA = {
    // 需要小圆点的图标单独补
    sliders: '<circle cx="13" cy="7" r="1.8"/><circle cx="10" cy="12" r="1.8"/><circle cx="15" cy="17" r="1.8"/>',
    // 骷髅眼睛用实心点，小尺寸下才认得出
    skull: '<circle cx="9.4" cy="10.2" r="1.15" fill="currentColor" stroke="none"/>' +
           '<circle cx="14.6" cy="10.2" r="1.15" fill="currentColor" stroke="none"/>'
  };

  function get(name, size) {
    size = size || 16;
    const d = P[name];
    if (!d) return "";
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true">' + (EXTRA[name] || "") +
      (d ? '<path d="' + d + '"/>' : "") + "</svg>";
  }

  return { get: get };
})();
