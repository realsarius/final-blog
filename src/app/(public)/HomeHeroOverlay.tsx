"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
const HERO_ANIMATION_MS = 520;
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
  availablePosts: PostOption[];
  isAdmin: boolean;
}

function normalizeAutoplaySeconds(value: number) {
  if (!Number.isFinite(value)) {
    return 10;
  }
  return Math.min(MAX_AUTOPLAY_SECONDS, Math.max(MIN_AUTOPLAY_SECONDS, Math.round(value)));
}

function sanitizeDirection(value: unknown): HeroTransitionDirection {
  return value === "right" ? "right" : "left";
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

export default function HomeHeroOverlay({ initialSlides, initialSettings, availablePosts, isAdmin }: HomeHeroOverlayProps) {
  const [slides, setSlides] = useState<HeroSlide[]>(initialSlides);
  const [activeIndex, setActiveIndex] = useState(0);
  const [previousIndex, setPreviousIndex] = useState<number | null>(null);
  const [animationPhase, setAnimationPhase] = useState<"idle" | "running">("idle");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [libraryImages, setLibraryImages] = useState<UploadListItem[]>([]);
  const [posts, setPosts] = useState<PostOption[]>(availablePosts);
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
  const previousActiveIndexRef = useRef(0);
  const animationTimerRef = useRef<number | null>(null);
  const paletteCacheRef = useRef<Record<string, { left: string; right: string }>>({});
  const palettePendingRef = useRef<Record<string, Promise<{ left: string; right: string }>>>({});

  const activeSlide = slides[activeIndex] ?? null;
  const previousSlide = previousIndex !== null ? slides[previousIndex] ?? null : null;
  const shouldAnimate = animationPhase === "running" && Boolean(activeSlide && previousSlide);
  const selectedPost = useMemo(
    () => posts.find((post) => post.id === selectedPostId) ?? null,
    [posts, selectedPostId],
  );

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, normalizeAutoplaySeconds(autoplaySeconds) * 1000);

    return () => window.clearInterval(interval);
  }, [autoplaySeconds, slides.length]);

  useEffect(() => {
    if (activeIndex === previousActiveIndexRef.current) {
      return;
    }
    const previous = previousActiveIndexRef.current;
    previousActiveIndexRef.current = activeIndex;
    setPreviousIndex(previous);
    setAnimationPhase("running");

    if (animationTimerRef.current !== null) {
      window.clearTimeout(animationTimerRef.current);
    }

    animationTimerRef.current = window.setTimeout(() => {
      setAnimationPhase("idle");
      setPreviousIndex(null);
      animationTimerRef.current = null;
    }, HERO_ANIMATION_MS);
  }, [activeIndex]);

  useEffect(() => {
    return () => {
      if (animationTimerRef.current !== null) {
        window.clearTimeout(animationTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (activeIndex < slides.length) {
      return;
    }
    setActiveIndex(0);
  }, [activeIndex, slides.length]);

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
    setActiveIndex(index);
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
        throw new Error(data.error ?? "R2 gorselleri yuklenemedi.");
      }

      setLibraryImages(data.files);
    } catch (error) {
      const message = error instanceof Error ? error.message : "R2 gorselleri yuklenemedi.";
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
      throw new Error("Featured guncellenemedi.");
    }

    setPosts((current) => current.map((post) => (
      post.id === postId ? { ...post, featured } : post
    )));
  }

  async function addComposedSlide() {
    const imageUrl = selectedImageUrl || selectedPost?.coverImageUrl || (selectedPost ? GENERIC_COVER_URL : "");
    if (!imageUrl) {
      window.alert("Lutfen bir gorsel secin ya da yazida kapak gorseli oldugundan emin olun.");
      return;
    }

    if (selectedPost && markAsFeatured && !selectedPost.featured) {
      try {
        await toggleFeatured(selectedPost.id, true);
      } catch {
        window.alert("Yazi featured olarak isaretlenemedi.");
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
    setSlides((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) {
        return current;
      }
      const copy = [...current];
      const [item] = copy.splice(index, 1);
      copy.splice(target, 0, item);
      return copy;
    });
    setActiveIndex((current) => {
      if (current === index) {
        return index + direction;
      }
      if (current === index + direction) {
        return index;
      }
      return current;
    });
  }

  function removeSlide(index: number) {
    setSlides((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setActiveIndex((current) => {
      if (current < index) {
        return current;
      }
      return Math.max(0, current - 1);
    });
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
        throw new Error(data.error ?? "Yukleme basarisiz.");
      }

      const freshImage = {
        key: data.file.key,
        url: data.file.url,
      };
      setLibraryImages((current) => [freshImage, ...current]);
      setSelectedImageUrl(data.file.url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Yukleme basarisiz.";
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
        throw new Error(data.error ?? "Kaydetme sirasinda bir hata olustu.");
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
      const message = error instanceof Error ? error.message : "Kaydetme sirasinda bir hata olustu.";
      window.alert(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      {activeSlide ? (
        <div className={styles.heroMedia} aria-hidden="true">
          {previousSlide ? (
            <div
              className={`${styles.heroMediaLayer} ${shouldAnimate ? (
                transitionDirection === "left" ? styles.heroSlideOutLeft : styles.heroSlideOutRight
              ) : ""}`}
              style={backgroundStyle(previousSlide.imageUrl)}
            />
          ) : null}
          <div
            className={`${styles.heroMediaLayer} ${shouldAnimate ? (
              transitionDirection === "left" ? styles.heroSlideInFromRight : styles.heroSlideInFromLeft
            ) : styles.heroSlideStatic}`}
            style={backgroundStyle(activeSlide.imageUrl)}
          />
        </div>
      ) : null}

      {activeSlide ? (
        activeSlide.postSlug ? (
          <div className={styles.heroActivePost} aria-live="polite">
            <Link href={`/blog/${activeSlide.postSlug}`} className={styles.heroActiveCard}>
              <NextImage
                src={activeSlide.postCoverImageUrl ?? GENERIC_COVER_URL}
                alt={activeSlide.postTitle ?? "One cikan yazi"}
                width={68}
                height={68}
                className={styles.heroActiveThumb}
              />
              <span className={styles.heroActiveMeta}>
                <strong>{activeSlide.postTitle ?? "Yaziyi Ac"}</strong>
                {activeSlide.postExcerpt ? <em>{activeSlide.postExcerpt}</em> : null}
              </span>
            </Link>
          </div>
        ) : null
      ) : null}

      {slides.length > 0 ? (
        <div className={styles.heroDots} aria-label="Hero slayt navigasyonu">
          {slides.map((slide, index) => (
            <button
              key={`${slide.imageUrl}-${index}`}
              type="button"
              className={`${styles.heroDot} ${index === activeIndex ? styles.heroDotActive : ""}`}
              onClick={() => goToSlide(index)}
              aria-label={`${index + 1}. slayta git`}
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
            aria-label="Hero duzenini duzenle"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 20h4l10.5-10.5a1.414 1.414 0 0 0 0-2L16.5 5.5a1.414 1.414 0 0 0-2 0L4 16v4z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="m13.5 8.5 2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {isEditorOpen ? (
            <div className={styles.heroEditor}>
              <div className={styles.heroEditorHeader}>
                <h3>Hero Duzenleyici</h3>
                <button type="button" onClick={() => setIsEditorOpen(false)}>Kapat</button>
              </div>

              <div className={styles.heroEditorBody}>
                <div className={styles.heroEditorBlock}>
                  <h4>Slayt Ekle</h4>
                  <div className={styles.heroComposerRow}>
                    <label htmlFor="hero-post-picker">Yazi</label>
                    <select
                      id="hero-post-picker"
                      className={styles.heroSelect}
                      value={selectedPostId}
                      onChange={(event) => setSelectedPostId(event.target.value)}
                    >
                      <option value="">Sadece gorsel slaydi</option>
                      {posts.map((post) => (
                        <option key={post.id} value={post.id}>
                          {post.title}{post.featured ? " (featured)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.heroComposerRow}>
                    <label>Secili Gorsel</label>
                    <div className={styles.heroSelectedImage}>
                      <span>{selectedImageUrl || selectedPost?.coverImageUrl || "Yok"}</span>
                      {selectedImageUrl ? (
                        <button type="button" onClick={() => setSelectedImageUrl("")}>Temizle</button>
                      ) : null}
                    </div>
                  </div>

                  <label className={styles.heroCheckbox}>
                    <input
                      type="checkbox"
                      checked={markAsFeatured}
                      onChange={(event) => setMarkAsFeatured(event.target.checked)}
                    />
                    <span>Yazi seciliyse featured yap</span>
                  </label>

                  <div className={styles.heroComposerActions}>
                    <button type="button" onClick={addComposedSlide}>Slayta Ekle</button>
                  </div>
                </div>

                <div className={styles.heroEditorBlock}>
                  <div className={styles.heroBlockHeader}>
                    <h4>Secili Slaytlar</h4>
                    <button
                      type="button"
                      onClick={() => {
                        void autoPickAllSlideColors();
                      }}
                      disabled={slides.length === 0 || colorLoadingIndex !== null}
                    >
                      Tumune Oto Renk
                    </button>
                  </div>
                  {slides.length === 0 ? <p>Henuz slayt eklenmedi.</p> : null}
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
                        <strong>{slide.postTitle ?? "Bagimsiz gorsel"}</strong>
                        <p>{slide.postSlug ? `/blog/${slide.postSlug}` : "Yazi bagi yok"}</p>
                        <div className={styles.heroColorRow}>
                          <label>
                            Sol
                            <input
                              type="color"
                              value={normalizeHexColor(slide.titleColorLeft) ?? DEFAULT_TITLE_COLOR_LEFT}
                              onChange={(event) => updateSlideColors(index, event.target.value, slide.titleColorRight ?? null)}
                            />
                          </label>
                          <label>
                            Sag
                            <input
                              type="color"
                              value={normalizeHexColor(slide.titleColorRight) ?? DEFAULT_TITLE_COLOR_RIGHT}
                              onChange={(event) => updateSlideColors(index, slide.titleColorLeft ?? null, event.target.value)}
                            />
                          </label>
                        </div>
                      </div>
                      <div className={styles.heroSlideRowActions}>
                        <button type="button" onClick={() => moveSlide(index, -1)} aria-label="Yukari al">↑</button>
                        <button type="button" onClick={() => moveSlide(index, 1)} aria-label="Asagi al">↓</button>
                        <button
                          type="button"
                          onClick={() => {
                            void autoPickSlideColors(index);
                          }}
                          disabled={colorLoadingIndex === index}
                        >
                          {colorLoadingIndex === index ? "Renk..." : "Oto Renk"}
                        </button>
                        <button type="button" onClick={() => removeSlide(index)}>Sil</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.heroEditorBlock}>
                  <h4>Oynatma ve Gecis</h4>
                  <div className={styles.heroComposerRow}>
                    <label htmlFor="hero-autoplay-seconds">Slayt suresi (saniye)</label>
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
                    <label htmlFor="hero-transition-direction">Gecis yonu</label>
                    <select
                      id="hero-transition-direction"
                      className={styles.heroSelect}
                      value={transitionDirection}
                      onChange={(event) => setTransitionDirection(sanitizeDirection(event.target.value))}
                    >
                      <option value="left">Sola kay</option>
                      <option value="right">Saga kay</option>
                    </select>
                  </div>
                </div>

                <div className={styles.heroEditorBlock}>
                  <h4>Yazi Secimi ve Featured</h4>
                  <div className={styles.heroPostList}>
                    {posts.map((post) => (
                      <div key={post.id} className={styles.heroPostRow}>
                        <button type="button" onClick={() => setSelectedPostId(post.id)}>{post.title}</button>
                        <button
                          type="button"
                          onClick={() => {
                            void toggleFeatured(post.id, !post.featured);
                          }}
                        >
                          {post.featured ? "Featured Kaldir" : "Featured Yap"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.heroEditorBlock}>
                  <h4>R2 Gorselleri</h4>
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
                      <option value="hero">hero klasoru</option>
                      <option value="uploads">uploads klasoru</option>
                    </select>
                    <button type="button" onClick={() => void loadLibrary()}>Yenile</button>
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
                      {isUploading ? "Yukleniyor..." : "Dosya Yukle"}
                    </label>
                  </div>
                  {isLoadingLibrary ? <p>Gorseller yukleniyor...</p> : null}
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
                  {isSaving ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
}
