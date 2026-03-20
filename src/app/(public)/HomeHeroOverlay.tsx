"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type TouchEvent } from "react";
import Link from "next/link";
import NextImage from "next/image";
import styles from "./page.module.css";

type HeroSlide = {
  id?: string;
  imageUrl: string;
  postId?: string | null;
  titleColorLeft?: string | null;
  titleColorRight?: string | null;
  postTitle?: string | null;
  postSlug?: string | null;
  postExcerpt?: string | null;
  postCoverImageUrl?: string | null;
};

type PostOption = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  featured: boolean;
};

type UploadListItem = {
  key: string;
  url: string;
};

type UploadListResponse = {
  success?: number;
  files?: UploadListItem[];
  error?: string;
};

type UploadPostResponse = {
  success?: number;
  file?: {
    url: string;
    key: string;
  };
  error?: string;
};

type SaveHeroResponse = {
  ok?: boolean;
  slides?: Array<{
    id: string;
    imageUrl: string;
    postId: string | null;
    titleColorLeft?: string | null;
    titleColorRight?: string | null;
    post: {
      id: string;
      title: string;
      slug: string;
      excerpt: string | null;
      coverImageUrl: string | null;
    } | null;
  }>;
  settings?: {
    autoplaySeconds: number;
    transitionDirection: "left" | "right";
  };
  error?: string;
};

const GENERIC_COVER_URL = "/hero-generic-cover.svg";
const MIN_AUTOPLAY_SECONDS = 2;
const MAX_AUTOPLAY_SECONDS = 60;
const DEFAULT_TITLE_COLOR_LEFT = "#9eae7b";
const DEFAULT_TITLE_COLOR_RIGHT = "#536546";

type HeroTransitionDirection = "left" | "right";

type HeroSettings = {
  autoplaySeconds: number;
  transitionDirection: HeroTransitionDirection;
};

interface HomeHeroOverlayProps {
  initialSlides: HeroSlide[];
  initialSettings: HeroSettings;
  initialPostOptions: PostOption[];
  isAdmin: boolean;
  locale?: "tr" | "en";
}

function normalizeAutoplaySeconds(value: number) {
  if (!Number.isFinite(value)) {
    return 10;
  }
  return Math.min(MAX_AUTOPLAY_SECONDS, Math.max(MIN_AUTOPLAY_SECONDS, Math.round(value)));
}

function sanitizeDirection(value: unknown): HeroTransitionDirection {
  if (typeof value !== "string") {
    return "left";
  }
  const normalized = value.trim().toUpperCase();
  return normalized === "RIGHT" ? "right" : "left";
}

function normalizeHexColor(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }
  if (!/^#[0-9a-f]{6}$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

export default function HomeHeroOverlay({
  initialSlides,
  initialSettings,
  initialPostOptions,
  isAdmin,
  locale = "tr",
}: HomeHeroOverlayProps) {
  const t = locale === "en"
    ? {
      r2LoadError: "R2 images could not be loaded.",
      featuredUpdateFailed: "Featured state could not be updated.",
      selectImageWarning: "Please select an image or make sure the selected post has a cover image.",
      featuredMarkFailed: "Post could not be marked as featured.",
      uploadFailed: "Upload failed.",
      saveFailed: "An error occurred while saving.",
      heroSliderAria: "Hero slider. You can navigate with left and right arrow keys.",
      prevSlide: "Previous slide",
      nextSlide: "Next slide",
      featuredPostAlt: "Featured post",
      openPost: "Open Post",
      dotsAria: "Hero slide navigation",
      goToSlide: "Go to slide {index}",
      editHero: "Edit hero layout",
      heroEditor: "Hero Editor",
      close: "Close",
      addSlide: "Add Slide",
      post: "Post",
      imageOnly: "Image-only slide",
      selectedImage: "Selected Image",
      none: "None",
      clear: "Clear",
      markFeatured: "Mark as featured if post is selected",
      addToSlides: "Add to slides",
      selectedSlides: "Selected Slides",
      autoColorAll: "Auto Color All",
      noSlides: "No slides added yet.",
      noPostLink: "No post link",
      left: "Left",
      right: "Right",
      moveUp: "Move up",
      moveDown: "Move down",
      autoColor: "Auto Color",
      coloring: "Color...",
      delete: "Delete",
      playback: "Playback & Transition",
      slideDuration: "Slide duration (seconds)",
      transitionDirection: "Transition direction",
      slideLeft: "Slide left",
      slideRight: "Slide right",
      postSelection: "Post Selection & Featured",
      postSearch: "Search posts",
      postSearchPlaceholder: "Search by title, summary, or slug",
      postListLoading: "Posts are loading...",
      postListEmpty: "No post found for this filter.",
      prevPage: "Prev",
      nextPage: "Next",
      pageLabel: "Page {page} / {total}",
      removeFeatured: "Remove Featured",
      makeFeatured: "Make Featured",
      r2Images: "R2 Images",
      heroFolder: "hero folder",
      uploadsFolder: "uploads folder",
      refresh: "Refresh",
      uploadFile: "Upload File",
      loading: "Loading...",
      imagesLoading: "Images are loading...",
      saving: "Saving...",
      save: "Save",
      independentImage: "Standalone image",
      noPostText: "No post",
    }
    : {
      r2LoadError: "R2 gorselleri yuklenemedi.",
      featuredUpdateFailed: "Featured guncellenemedi.",
      selectImageWarning: "Lutfen bir gorsel secin ya da yazida kapak gorseli oldugundan emin olun.",
      featuredMarkFailed: "Yazi featured olarak isaretlenemedi.",
      uploadFailed: "Yukleme basarisiz.",
      saveFailed: "Kaydetme sirasinda bir hata olustu.",
      heroSliderAria: "Hero slider. Sol ve sag ok tuslariyla gecis yapabilirsiniz.",
      prevSlide: "Onceki slayt",
      nextSlide: "Sonraki slayt",
      featuredPostAlt: "One cikan yazi",
      openPost: "Yaziyi Ac",
      dotsAria: "Hero slayt navigasyonu",
      goToSlide: "{index}. slayta git",
      editHero: "Hero duzenini duzenle",
      heroEditor: "Hero Duzenleyici",
      close: "Kapat",
      addSlide: "Slayt Ekle",
      post: "Yazi",
      imageOnly: "Sadece gorsel slaydi",
      selectedImage: "Secili Gorsel",
      none: "Yok",
      clear: "Temizle",
      markFeatured: "Yazi seciliyse featured yap",
      addToSlides: "Slayta Ekle",
      selectedSlides: "Secili Slaytlar",
      autoColorAll: "Tumune Oto Renk",
      noSlides: "Henuz slayt eklenmedi.",
      noPostLink: "Yazi bagi yok",
      left: "Sol",
      right: "Sag",
      moveUp: "Yukari al",
      moveDown: "Asagi al",
      autoColor: "Oto Renk",
      coloring: "Renk...",
      delete: "Sil",
      playback: "Oynatma ve Gecis",
      slideDuration: "Slayt suresi (saniye)",
      transitionDirection: "Gecis yonu",
      slideLeft: "Sola kay",
      slideRight: "Saga kay",
      postSelection: "Yazi Secimi ve Featured",
      postSearch: "Yazi ara",
      postSearchPlaceholder: "Baslik, ozet veya slug ile ara",
      postListLoading: "Yazilar yukleniyor...",
      postListEmpty: "Bu filtreye uygun yazi bulunamadi.",
      prevPage: "Onceki",
      nextPage: "Sonraki",
      pageLabel: "Sayfa {page} / {total}",
      removeFeatured: "Featured Kaldir",
      makeFeatured: "Featured Yap",
      r2Images: "R2 Gorselleri",
      heroFolder: "hero klasoru",
      uploadsFolder: "uploads klasoru",
      refresh: "Yenile",
      uploadFile: "Dosya Yukle",
      loading: "Yukleniyor...",
      imagesLoading: "Gorseller yukleniyor...",
      saving: "Kaydediliyor...",
      save: "Kaydet",
      independentImage: "Bagimsiz gorsel",
      noPostText: "Yazi yok",
    };
  const [slides, setSlides] = useState<HeroSlide[]>(initialSlides);
  const [activeIndex, setActiveIndex] = useState(0);
  const [trackIndex, setTrackIndex] = useState(0);
  const [trackTransitionMs, setTrackTransitionMs] = useState(520);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [libraryImages, setLibraryImages] = useState<UploadListItem[]>([]);
  const [posts, setPosts] = useState<PostOption[]>(initialPostOptions);
  const [postQuery, setPostQuery] = useState("");
  const [postPage, setPostPage] = useState(1);
  const [postTotalPages, setPostTotalPages] = useState(1);
  const [selectedPostId, setSelectedPostId] = useState<string>("");
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>("");
  const [markAsFeatured, setMarkAsFeatured] = useState(true);
  const [libraryFolder, setLibraryFolder] = useState("hero");
  const [autoplaySeconds, setAutoplaySeconds] = useState(
    normalizeAutoplaySeconds(initialSettings.autoplaySeconds),
  );
  const [transitionDirection, setTransitionDirection] = useState<HeroTransitionDirection>(
    sanitizeDirection(initialSettings.transitionDirection),
  );
  const [colorLoadingIndex, setColorLoadingIndex] = useState<number | null>(null);
  const paletteCacheRef = useRef<Record<string, { left: string; right: string }>>({});
  const palettePendingRef = useRef<Record<string, Promise<{ left: string; right: string }>>>({});
  const postRequestRef = useRef(0);
  const autoplayDirectionRef = useRef<HeroTransitionDirection>(sanitizeDirection(initialSettings.transitionDirection));
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const [postCache, setPostCache] = useState<Record<string, PostOption>>(() => {
    return initialPostOptions.reduce<Record<string, PostOption>>((acc, post) => {
      acc[post.id] = post;
      return acc;
    }, {});
  });

  const activeSlide = slides[activeIndex] ?? null;
  const carouselSlides = useMemo(() => slides, [slides]);
  const selectedPost = useMemo(
    () => (selectedPostId ? postCache[selectedPostId] ?? null : null),
    [postCache, selectedPostId],
  );

  const runRewindToStart = useCallback(() => {
    if (slides.length <= 1 || activeIndex !== slides.length - 1) {
      return false;
    }
    const rewindDuration = Math.min(900, Math.max(240, (slides.length - 1) * 220));
    setTrackTransitionMs(rewindDuration);
    setTrackIndex(0);
    setActiveIndex(0);
    return true;
  }, [activeIndex, slides.length]);

  const runForwardToEnd = useCallback(() => {
    if (slides.length <= 1 || activeIndex !== 0) {
      return false;
    }
    const rewindDuration = Math.min(900, Math.max(240, (slides.length - 1) * 220));
    setTrackTransitionMs(rewindDuration);
    setTrackIndex(slides.length - 1);
    setActiveIndex(slides.length - 1);
    return true;
  }, [activeIndex, slides.length]);

  const goToNextSlide = useCallback(() => {
    if (slides.length <= 1) {
      return;
    }
    if (runRewindToStart()) {
      return;
    }
    setTrackTransitionMs(520);
    setTrackIndex((current) => Math.min(slides.length - 1, current + 1));
    setActiveIndex((current) => Math.min(slides.length - 1, current + 1));
  }, [runRewindToStart, slides.length]);

  const goToPreviousSlide = useCallback(() => {
    if (slides.length <= 1) {
      return;
    }
    if (runForwardToEnd()) {
      return;
    }
    setTrackTransitionMs(520);
    setTrackIndex((current) => Math.max(0, current - 1));
    setActiveIndex((current) => Math.max(0, current - 1));
  }, [runForwardToEnd, slides.length]);

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }

    const interval = window.setInterval(() => {
      if (autoplayDirectionRef.current === "right") {
        goToPreviousSlide();
        return;
      }
      goToNextSlide();
    }, normalizeAutoplaySeconds(autoplaySeconds) * 1000);

    return () => window.clearInterval(interval);
  }, [autoplaySeconds, goToNextSlide, goToPreviousSlide, slides.length]);

  useEffect(() => {
    autoplayDirectionRef.current = transitionDirection;
  }, [transitionDirection]);

  useEffect(() => {
    if (slides.length === 0) {
      setActiveIndex(0);
      setTrackIndex(0);
      return;
    }

    setActiveIndex((current) => {
      if (current < slides.length) {
        return current;
      }
      return slides.length - 1;
    });
    setTrackIndex((current) => {
      if (current < slides.length) {
        return current;
      }
      return slides.length - 1;
    });
  }, [slides.length]);

  useEffect(() => {
    const hero = document.getElementById("home-hero");
    if (!hero) {
      return;
    }
    const left = normalizeHexColor(activeSlide?.titleColorLeft) ?? DEFAULT_TITLE_COLOR_LEFT;
    const right = normalizeHexColor(activeSlide?.titleColorRight) ?? DEFAULT_TITLE_COLOR_RIGHT;
    hero.style.setProperty("--hero-title-left", left);
    hero.style.setProperty("--hero-title-right", right);
  }, [activeSlide?.titleColorLeft, activeSlide?.titleColorRight]);

  function backgroundStyle(imageUrl: string | undefined) {
    if (!imageUrl) {
      return undefined;
    }
    const escapedUrl = imageUrl.replace(/["\\]/g, "\\$&");
    return {
      backgroundImage: `linear-gradient(110deg, rgba(18, 23, 16, 0.26), rgba(18, 23, 16, 0.08)), url("${escapedUrl}")`,
    };
  }

  function goToSlide(index: number) {
    if (index < 0 || index >= slides.length || index === activeIndex) {
      return;
    }
    if (index > activeIndex) {
      autoplayDirectionRef.current = "left";
    } else {
      autoplayDirectionRef.current = "right";
    }
    setTransitionDirection(autoplayDirectionRef.current);
    setTrackTransitionMs(520);
    setTrackIndex(index);
    setActiveIndex(index);
  }

  function handleTrackTransitionEnd() {
    setTrackTransitionMs(520);
  }

  function handleHeroKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (slides.length <= 1) {
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      autoplayDirectionRef.current = "left";
      setTransitionDirection("left");
      goToNextSlide();
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      autoplayDirectionRef.current = "right";
      setTransitionDirection("right");
      goToPreviousSlide();
    }
  }

  function handleHeroTouchStart(event: TouchEvent<HTMLDivElement>) {
    const touch = event.changedTouches[0];
    if (!touch) {
      return;
    }
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
  }

  function handleHeroTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const touch = event.changedTouches[0];
    const startX = touchStartXRef.current;
    const startY = touchStartYRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;

    if (!touch || startX === null || startY === null || slides.length <= 1) {
      return;
    }

    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    if (Math.abs(deltaX) < 38 || Math.abs(deltaY) > Math.abs(deltaX)) {
      return;
    }

    if (deltaX < 0) {
      autoplayDirectionRef.current = "left";
      setTransitionDirection("left");
      goToNextSlide();
      return;
    }

    autoplayDirectionRef.current = "right";
    setTransitionDirection("right");
    goToPreviousSlide();
  }

  function updateSlideColors(index: number, nextLeft: string | null, nextRight: string | null) {
    setSlides((current) => current.map((slide, itemIndex) => (
      itemIndex === index
        ? {
          ...slide,
          titleColorLeft: normalizeHexColor(nextLeft),
          titleColorRight: normalizeHexColor(nextRight),
        }
        : slide
    )));
  }

  const getAverageColor = useCallback((data: Uint8ClampedArray, width: number, height: number, fromX: number, toX: number) => {
    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;

    for (let y = 0; y < height; y += 1) {
      for (let x = fromX; x < toX; x += 1) {
        const offset = (y * width + x) * 4;
        r += data[offset] ?? 0;
        g += data[offset + 1] ?? 0;
        b += data[offset + 2] ?? 0;
        count += 1;
      }
    }

    if (count === 0) {
      return "#7f8c6a";
    }

    const rr = Math.round(r / count).toString(16).padStart(2, "0");
    const gg = Math.round(g / count).toString(16).padStart(2, "0");
    const bb = Math.round(b / count).toString(16).padStart(2, "0");
    return `#${rr}${gg}${bb}`;
  }, []);

  const deriveTitleColorsFromImage = useCallback(async (imageUrl: string) => {
    return new Promise<{ left: string; right: string }>((resolve) => {
      const image = new Image();
      image.crossOrigin = "anonymous";

      image.onload = () => {
        try {
          const width = Math.min(320, Math.max(32, image.naturalWidth || image.width));
          const height = Math.min(180, Math.max(32, image.naturalHeight || image.height));
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext("2d");
          if (!context) {
            resolve({ left: DEFAULT_TITLE_COLOR_LEFT, right: DEFAULT_TITLE_COLOR_RIGHT });
            return;
          }
          context.drawImage(image, 0, 0, width, height);
          const pixels = context.getImageData(0, 0, width, height).data;
          const band = Math.max(1, Math.floor(width * 0.24));
          const left = getAverageColor(pixels, width, height, 0, band);
          const right = getAverageColor(pixels, width, height, width - band, width);
          resolve({ left, right });
        } catch {
          resolve({ left: DEFAULT_TITLE_COLOR_LEFT, right: DEFAULT_TITLE_COLOR_RIGHT });
        }
      };

      image.onerror = () => resolve({ left: DEFAULT_TITLE_COLOR_LEFT, right: DEFAULT_TITLE_COLOR_RIGHT });
      image.src = imageUrl;
    });
  }, [getAverageColor]);

  const deriveTitleColorsFromImageCached = useCallback(async (imageUrl: string) => {
    const cached = paletteCacheRef.current[imageUrl];
    if (cached) {
      return cached;
    }
    const pending = palettePendingRef.current[imageUrl];
    if (pending) {
      return pending;
    }

    const task = deriveTitleColorsFromImage(imageUrl).then((palette) => {
      paletteCacheRef.current[imageUrl] = palette;
      delete palettePendingRef.current[imageUrl];
      return palette;
    });
    palettePendingRef.current[imageUrl] = task;
    return task;
  }, [deriveTitleColorsFromImage]);

  async function autoPickSlideColors(index: number) {
    const slide = slides[index];
    if (!slide?.imageUrl) {
      return;
    }
    setColorLoadingIndex(index);
    try {
      const palette = await deriveTitleColorsFromImageCached(slide.imageUrl);
      updateSlideColors(index, palette.left, palette.right);
    } finally {
      setColorLoadingIndex(null);
    }
  }

  async function autoPickAllSlideColors() {
    for (let index = 0; index < slides.length; index += 1) {
      await autoPickSlideColors(index);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function fillMissingColors() {
      for (let index = 0; index < slides.length; index += 1) {
        const slide = slides[index];
        if (!slide?.imageUrl) {
          continue;
        }
        if (normalizeHexColor(slide.titleColorLeft) && normalizeHexColor(slide.titleColorRight)) {
          continue;
        }

        const palette = await deriveTitleColorsFromImageCached(slide.imageUrl);
        if (cancelled) {
          return;
        }

        setSlides((current) => {
          const target = current[index];
          if (!target) {
            return current;
          }
          const hasLeft = normalizeHexColor(target.titleColorLeft);
          const hasRight = normalizeHexColor(target.titleColorRight);
          if (hasLeft && hasRight) {
            return current;
          }
          const copy = [...current];
          copy[index] = {
            ...target,
            titleColorLeft: hasLeft ?? palette.left,
            titleColorRight: hasRight ?? palette.right,
          };
          return copy;
        });
      }
    }

    void fillMissingColors();
    return () => {
      cancelled = true;
    };
  }, [deriveTitleColorsFromImageCached, slides]);

  const loadPosts = useCallback(async (page: number, query: string) => {
    if (!isAdmin) {
      return;
    }

    const requestId = postRequestRef.current + 1;
    postRequestRef.current = requestId;
    setIsLoadingPosts(true);

    try {
      const response = await fetch(
        `/api/admin/posts/options?page=${page}&limit=12&q=${encodeURIComponent(query)}`,
        {
          method: "GET",
          credentials: "same-origin",
        },
      );

      const data = await response.json() as {
        ok?: boolean;
        items?: PostOption[];
        totalPages?: number;
      };

      if (!response.ok || data.ok !== true || !Array.isArray(data.items)) {
        throw new Error("Failed to load post options");
      }
      if (postRequestRef.current !== requestId) {
        return;
      }

      setPosts(data.items);
      setPostTotalPages(Math.max(1, Number(data.totalPages) || 1));
      setPostCache((current) => {
        const next = { ...current };
        data.items.forEach((item) => {
          next[item.id] = item;
        });
        return next;
      });
    } catch {
      if (postRequestRef.current !== requestId) {
        return;
      }
      setPosts([]);
      setPostTotalPages(1);
    } finally {
      if (postRequestRef.current === requestId) {
        setIsLoadingPosts(false);
      }
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || !isEditorOpen) {
      return;
    }

    const timer = window.setTimeout(() => {
      void loadPosts(postPage, postQuery);
    }, postQuery ? 240 : 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [isAdmin, isEditorOpen, loadPosts, postPage, postQuery]);

  async function loadLibrary(folder = libraryFolder) {
    if (!isAdmin) {
      return;
    }

    setIsLoadingLibrary(true);
    setLibraryError(null);

    try {
      const response = await fetch(`/api/uploads?folder=${encodeURIComponent(folder)}&limit=100`, {
        method: "GET",
        credentials: "same-origin",
      });
      const data = await response.json() as UploadListResponse;

      if (!response.ok || data.success !== 1 || !Array.isArray(data.files)) {
        throw new Error(data.error ?? t.r2LoadError);
      }

      setLibraryImages(data.files);
    } catch (error) {
      const message = error instanceof Error ? error.message : t.r2LoadError;
      setLibraryError(message);
    } finally {
      setIsLoadingLibrary(false);
    }
  }

  function addSlide(next: HeroSlide) {
    setSlides((current) => {
      const exists = current.some((item) => item.imageUrl === next.imageUrl && item.postId === (next.postId ?? null));
      if (exists) {
        return current;
      }
      return [...current, next].slice(0, 10);
    });
  }

  async function toggleFeatured(postId: string, featured: boolean) {
    const response = await fetch(`/api/admin/posts/${postId}/featured`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({ featured }),
    });

    if (!response.ok) {
      throw new Error(t.featuredUpdateFailed);
    }

    setPosts((current) => current.map((post) => (
      post.id === postId ? { ...post, featured } : post
    )));
    setPostCache((current) => {
      const post = current[postId];
      if (!post) {
        return current;
      }
      return {
        ...current,
        [postId]: {
          ...post,
          featured,
        },
      };
    });
  }

  async function addComposedSlide() {
    const imageUrl = selectedImageUrl || selectedPost?.coverImageUrl || (selectedPost ? GENERIC_COVER_URL : "");
    if (!imageUrl) {
      window.alert(t.selectImageWarning);
      return;
    }

    if (selectedPost && markAsFeatured && !selectedPost.featured) {
      try {
        await toggleFeatured(selectedPost.id, true);
      } catch {
        window.alert(t.featuredMarkFailed);
      }
    }

    const palette = await deriveTitleColorsFromImageCached(imageUrl);

    addSlide({
      imageUrl,
      postId: selectedPost?.id ?? null,
      titleColorLeft: palette.left,
      titleColorRight: palette.right,
      postTitle: selectedPost?.title ?? null,
      postSlug: selectedPost?.slug ?? null,
      postExcerpt: selectedPost?.excerpt ?? null,
      postCoverImageUrl: selectedPost?.coverImageUrl ?? (selectedPost ? GENERIC_COVER_URL : null),
    });
  }

  function moveSlide(index: number, direction: -1 | 1) {
    let nextActiveIndex = activeIndex;
    setSlides((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) {
        return current;
      }
      const copy = [...current];
      const [item] = copy.splice(index, 1);
      copy.splice(target, 0, item);
      if (activeIndex === index) {
        nextActiveIndex = target;
      } else if (activeIndex === target) {
        nextActiveIndex = index;
      }
      return copy;
    });
    setTrackTransitionMs(520);
    setActiveIndex(nextActiveIndex);
    setTrackIndex(nextActiveIndex);
  }

  function removeSlide(index: number) {
    let nextActiveIndex = activeIndex;
    setSlides((current) => {
      const nextSlides = current.filter((_, itemIndex) => itemIndex !== index);
      if (nextSlides.length === 0) {
        nextActiveIndex = 0;
      } else if (activeIndex > index) {
        nextActiveIndex = activeIndex - 1;
      } else if (activeIndex === index) {
        nextActiveIndex = Math.max(0, activeIndex - 1);
      }
      return nextSlides;
    });
    setTrackTransitionMs(520);
    setActiveIndex(nextActiveIndex);
    setTrackIndex(nextActiveIndex);
  }

  async function uploadToR2(file: File) {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("folder", "hero");

      const response = await fetch("/api/uploads", {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });

      const data = await response.json() as UploadPostResponse;
      if (!response.ok || data.success !== 1 || !data.file?.url) {
        throw new Error(data.error ?? t.uploadFailed);
      }

      const freshImage = {
        key: data.file.key,
        url: data.file.url,
      };
      setLibraryImages((current) => [freshImage, ...current]);
      setSelectedImageUrl(data.file.url);
    } catch (error) {
      const message = error instanceof Error ? error.message : t.uploadFailed;
      window.alert(message);
    } finally {
      setIsUploading(false);
    }
  }

  async function saveSlides() {
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/hero", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          slides: slides.map((slide) => ({
            imageUrl: slide.imageUrl,
            postId: slide.postId ?? null,
            titleColorLeft: normalizeHexColor(slide.titleColorLeft),
            titleColorRight: normalizeHexColor(slide.titleColorRight),
          })),
          settings: {
            autoplaySeconds: normalizeAutoplaySeconds(autoplaySeconds),
            transitionDirection,
          },
        }),
      });

      const data = await response.json() as SaveHeroResponse;
      if (!response.ok || !data.ok || !Array.isArray(data.slides)) {
        throw new Error(data.error ?? t.saveFailed);
      }

      const normalized: HeroSlide[] = data.slides.map((slide) => ({
        id: slide.id,
        imageUrl: slide.imageUrl,
        postId: slide.postId,
        titleColorLeft: normalizeHexColor(slide.titleColorLeft),
        titleColorRight: normalizeHexColor(slide.titleColorRight),
        postTitle: slide.post?.title ?? null,
        postSlug: slide.post?.slug ?? null,
        postExcerpt: slide.post?.excerpt ?? null,
        postCoverImageUrl: slide.post?.coverImageUrl ?? (slide.post ? GENERIC_COVER_URL : null),
      }));

      setSlides(normalized);
      if (data.settings) {
        setAutoplaySeconds(normalizeAutoplaySeconds(data.settings.autoplaySeconds));
        setTransitionDirection(sanitizeDirection(data.settings.transitionDirection));
      }
      setIsEditorOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : t.saveFailed;
      window.alert(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      {activeSlide ? (
        <div
          className={styles.heroMedia}
          tabIndex={0}
          onKeyDown={handleHeroKeyDown}
          onTouchStart={handleHeroTouchStart}
          onTouchEnd={handleHeroTouchEnd}
          aria-label={t.heroSliderAria}
        >
          <div
            className={`${styles.heroTrack} ${styles.heroTrackTransition}`}
            style={{
              transform: `translate3d(${-trackIndex * 100}%, 0, 0)`,
              transitionDuration: `${trackTransitionMs}ms`,
            }}
            onTransitionEnd={handleTrackTransitionEnd}
            aria-hidden="true"
          >
            {carouselSlides.map((slide, index) => (
              <div
                key={`${slide.id ?? slide.imageUrl}-${index}`}
                className={styles.heroMediaLayer}
                style={backgroundStyle(slide.imageUrl)}
              />
            ))}
          </div>

          {slides.length > 1 ? (
            <>
              <button
                type="button"
                className={`${styles.heroArrow} ${styles.heroArrowLeft}`}
                onClick={() => {
                  autoplayDirectionRef.current = "right";
                  setTransitionDirection("right");
                  goToPreviousSlide();
                }}
                aria-label={t.prevSlide}
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M14.5 5.5 8 12l6.5 6.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                className={`${styles.heroArrow} ${styles.heroArrowRight}`}
                onClick={() => {
                  autoplayDirectionRef.current = "left";
                  setTransitionDirection("left");
                  goToNextSlide();
                }}
                aria-label={t.nextSlide}
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M9.5 5.5 16 12l-6.5 6.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {activeSlide ? (
        activeSlide.postSlug ? (
          <div className={styles.heroActivePost} aria-live="polite">
            <Link href={`/blog/${activeSlide.postSlug}`} className={styles.heroActiveCard}>
              <NextImage
                src={activeSlide.postCoverImageUrl ?? GENERIC_COVER_URL}
                alt={activeSlide.postTitle ?? t.featuredPostAlt}
                width={68}
                height={68}
                className={styles.heroActiveThumb}
              />
              <span className={styles.heroActiveMeta}>
                <strong>{activeSlide.postTitle ?? t.openPost}</strong>
                {activeSlide.postExcerpt ? <em>{activeSlide.postExcerpt}</em> : null}
              </span>
            </Link>
          </div>
        ) : null
      ) : null}

      {slides.length > 0 ? (
        <div className={styles.heroDots} aria-label={t.dotsAria}>
          {slides.map((slide, index) => (
            <button
              key={`${slide.imageUrl}-${index}`}
              type="button"
              className={`${styles.heroDot} ${index === activeIndex ? styles.heroDotActive : ""}`}
              onClick={() => goToSlide(index)}
              aria-label={t.goToSlide.replace("{index}", String(index + 1))}
              aria-current={index === activeIndex ? "true" : undefined}
              disabled={slides.length === 1}
            />
          ))}
        </div>
      ) : null}

      {isAdmin ? (
        <>
          <button
            type="button"
            className={styles.heroEditButton}
            onClick={() => {
              setIsEditorOpen((open) => {
                const next = !open;
                if (next) {
                  void loadLibrary();
                }
                return next;
              });
            }}
            aria-label={t.editHero}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 20h4l10.5-10.5a1.414 1.414 0 0 0 0-2L16.5 5.5a1.414 1.414 0 0 0-2 0L4 16v4z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="m13.5 8.5 2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {isEditorOpen ? (
            <div className={styles.heroEditor}>
              <div className={styles.heroEditorHeader}>
                <h3>{t.heroEditor}</h3>
                <button type="button" onClick={() => setIsEditorOpen(false)}>{t.close}</button>
              </div>

              <div className={styles.heroEditorBody}>
                <div className={styles.heroEditorBlock}>
                  <h4>{t.addSlide}</h4>
                  <div className={styles.heroComposerRow}>
                    <label htmlFor="hero-post-picker">{t.post}</label>
                    <select
                      id="hero-post-picker"
                      className={styles.heroSelect}
                      value={selectedPostId}
                      onChange={(event) => setSelectedPostId(event.target.value)}
                    >
                      <option value="">{t.imageOnly}</option>
                      {selectedPost && !posts.some((post) => post.id === selectedPost.id) ? (
                        <option value={selectedPost.id}>
                          {selectedPost.title}{selectedPost.featured ? " (featured)" : ""}
                        </option>
                      ) : null}
                      {posts.map((post) => (
                        <option key={post.id} value={post.id}>
                          {post.title}{post.featured ? " (featured)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.heroComposerRow}>
                    <label>{t.selectedImage}</label>
                    <div className={styles.heroSelectedImage}>
                      <span>{selectedImageUrl || selectedPost?.coverImageUrl || t.none}</span>
                      {selectedImageUrl ? (
                        <button type="button" onClick={() => setSelectedImageUrl("")}>{t.clear}</button>
                      ) : null}
                    </div>
                  </div>

                  <label className={styles.heroCheckbox}>
                    <input
                      type="checkbox"
                      checked={markAsFeatured}
                      onChange={(event) => setMarkAsFeatured(event.target.checked)}
                    />
                    <span>{t.markFeatured}</span>
                  </label>

                  <div className={styles.heroComposerActions}>
                    <button type="button" onClick={addComposedSlide}>{t.addToSlides}</button>
                  </div>
                </div>

                <div className={styles.heroEditorBlock}>
                  <div className={styles.heroBlockHeader}>
                    <h4>{t.selectedSlides}</h4>
                    <button
                      type="button"
                      onClick={() => {
                        void autoPickAllSlideColors();
                      }}
                      disabled={slides.length === 0 || colorLoadingIndex !== null}
                    >
                      {t.autoColorAll}
                    </button>
                  </div>
                  {slides.length === 0 ? <p>{t.noSlides}</p> : null}
                  {slides.map((slide, index) => (
                    <div key={`${slide.imageUrl}-${slide.postId ?? "none"}-${index}`} className={styles.heroSlideRow}>
                      <NextImage
                        src={slide.imageUrl}
                        alt="Hero slide"
                        width={72}
                        height={48}
                        className={styles.heroSlideThumb}
                      />
                      <div>
                        <strong>{slide.postTitle ?? t.independentImage}</strong>
                        <p>{slide.postSlug ? `/blog/${slide.postSlug}` : t.noPostLink}</p>
                        <div className={styles.heroColorRow}>
                          <label>
                            {t.left}
                            <input
                              type="color"
                              value={normalizeHexColor(slide.titleColorLeft) ?? DEFAULT_TITLE_COLOR_LEFT}
                              onChange={(event) => updateSlideColors(index, event.target.value, slide.titleColorRight ?? null)}
                            />
                          </label>
                          <label>
                            {t.right}
                            <input
                              type="color"
                              value={normalizeHexColor(slide.titleColorRight) ?? DEFAULT_TITLE_COLOR_RIGHT}
                              onChange={(event) => updateSlideColors(index, slide.titleColorLeft ?? null, event.target.value)}
                            />
                          </label>
                        </div>
                      </div>
                      <div className={styles.heroSlideRowActions}>
                        <button type="button" onClick={() => moveSlide(index, -1)} aria-label={t.moveUp}>↑</button>
                        <button type="button" onClick={() => moveSlide(index, 1)} aria-label={t.moveDown}>↓</button>
                        <button
                          type="button"
                          onClick={() => {
                            void autoPickSlideColors(index);
                          }}
                          disabled={colorLoadingIndex === index}
                        >
                          {colorLoadingIndex === index ? t.coloring : t.autoColor}
                        </button>
                        <button type="button" onClick={() => removeSlide(index)}>{t.delete}</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.heroEditorBlock}>
                  <h4>{t.playback}</h4>
                  <div className={styles.heroComposerRow}>
                    <label htmlFor="hero-autoplay-seconds">{t.slideDuration}</label>
                    <input
                      id="hero-autoplay-seconds"
                      type="number"
                      min={MIN_AUTOPLAY_SECONDS}
                      max={MAX_AUTOPLAY_SECONDS}
                      step={1}
                      className={styles.heroInput}
                      value={autoplaySeconds}
                      onChange={(event) => {
                        setAutoplaySeconds(normalizeAutoplaySeconds(Number(event.target.value)));
                      }}
                    />
                  </div>
                  <div className={styles.heroComposerRow}>
                    <label htmlFor="hero-transition-direction">{t.transitionDirection}</label>
                    <select
                      id="hero-transition-direction"
                      className={styles.heroSelect}
                      value={transitionDirection}
                      onChange={(event) => setTransitionDirection(sanitizeDirection(event.target.value))}
                    >
                      <option value="left">{t.slideLeft}</option>
                      <option value="right">{t.slideRight}</option>
                    </select>
                  </div>
                </div>

                <div className={styles.heroEditorBlock}>
                  <h4>{t.postSelection}</h4>
                  <div className={styles.heroComposerRow}>
                    <label htmlFor="hero-post-search">{t.postSearch}</label>
                    <input
                      id="hero-post-search"
                      type="search"
                      className={styles.heroInput}
                      value={postQuery}
                      placeholder={t.postSearchPlaceholder}
                      onChange={(event) => {
                        setPostQuery(event.target.value);
                        setPostPage(1);
                      }}
                    />
                  </div>
                  <div className={styles.heroPostList}>
                    {isLoadingPosts ? <p className={styles.heroPostListState}>{t.postListLoading}</p> : null}
                    {!isLoadingPosts && posts.length === 0 ? (
                      <p className={styles.heroPostListState}>{t.postListEmpty}</p>
                    ) : null}
                    {posts.map((post) => (
                      <div key={post.id} className={styles.heroPostRow}>
                        <button type="button" onClick={() => setSelectedPostId(post.id)}>{post.title}</button>
                        <button
                          type="button"
                          onClick={() => {
                            void toggleFeatured(post.id, !post.featured);
                          }}
                        >
                          {post.featured ? t.removeFeatured : t.makeFeatured}
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className={styles.heroPostPagination}>
                    <button
                      type="button"
                      onClick={() => setPostPage((current) => Math.max(1, current - 1))}
                      disabled={isLoadingPosts || postPage <= 1}
                    >
                      {t.prevPage}
                    </button>
                    <span>{t.pageLabel.replace("{page}", String(postPage)).replace("{total}", String(postTotalPages))}</span>
                    <button
                      type="button"
                      onClick={() => setPostPage((current) => Math.min(postTotalPages, current + 1))}
                      disabled={isLoadingPosts || postPage >= postTotalPages}
                    >
                      {t.nextPage}
                    </button>
                  </div>
                </div>

                <div className={styles.heroEditorBlock}>
                  <h4>{t.r2Images}</h4>
                  <div className={styles.heroLibraryTop}>
                    <select
                      className={styles.heroSelect}
                      value={libraryFolder}
                      onChange={(event) => {
                        const next = event.target.value;
                        setLibraryFolder(next);
                        void loadLibrary(next);
                      }}
                    >
                      <option value="hero">{t.heroFolder}</option>
                      <option value="uploads">{t.uploadsFolder}</option>
                    </select>
                    <button type="button" onClick={() => void loadLibrary()}>{t.refresh}</button>
                    <label className={styles.heroUploadButton}>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) {
                            return;
                          }
                          void uploadToR2(file);
                          event.currentTarget.value = "";
                        }}
                      />
                      {isUploading ? t.loading : t.uploadFile}
                    </label>
                  </div>
                  {isLoadingLibrary ? <p>{t.imagesLoading}</p> : null}
                  {libraryError ? <p>{libraryError}</p> : null}
                  <div className={styles.heroImageGrid}>
                    {libraryImages.map((image) => (
                      <button
                        key={image.key}
                        type="button"
                        className={`${styles.heroImageTile} ${selectedImageUrl === image.url ? styles.heroImageTileSelected : ""}`}
                        onClick={() => setSelectedImageUrl(image.url)}
                        title={image.key}
                      >
                        <NextImage
                          src={image.url}
                          alt={image.key}
                          fill
                          sizes="(max-width: 900px) 33vw, 110px"
                          className={styles.heroImage}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className={styles.heroEditorFooter}>
                <button type="button" onClick={saveSlides} disabled={isSaving}>
                  {isSaving ? t.saving : t.save}
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
}
