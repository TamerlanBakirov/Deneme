// Monetization: gentle, opt-in rewarded ads + a "Remove Ads / Premium" purchase.
//
// Design (the player chose the gentle option): there are NO forced ads. The
// only ad surface is an optional rewarded video the player can choose to watch
// for a bonus (an extra hint, or extra hearts when out of hearts). The
// "Remove Ads" purchase turns those bonuses into instant, ad-free perks (and
// future-proofs against any banner/interstitial added later).
//
// Everything here degrades to a safe no-op on the web and whenever the native
// AdMob plugin / store products aren't configured, so the game runs unchanged
// during development.
//
// To enable real ads + purchases on a device:
//   1. npm install @capacitor-community/admob
//   2. (for the purchase) add an in-app-purchase plugin and a "premium" product
//      in App Store Connect / Google Play, then wire purchasePremium()/restore().
//   3. npx cap sync
//   4. Replace the AdMob test unit IDs below with your real ones and set
//      ADMOB_CONFIG.isTesting = false for production.
//   5. iOS: add GADApplicationIdentifier to Info.plist. Android: add the AdMob
//      App ID to AndroidManifest.xml (see the plugin README).
const ADMOB_CONFIG = {
  // Google's official TEST rewarded unit IDs — safe to ship while developing.
  // Swap these for your own production unit IDs before release.
  rewardedAndroid: "ca-app-pub-3940256099942544/5224354917",
  rewardedIos: "ca-app-pub-3940256099942544/1712485313",
  isTesting: true,
};

const Ads = (() => {
  const PREMIUM_KEY = "knot-escape-premium";
  let initialized = false;

  function admob() {
    return (
      window.Capacitor &&
      window.Capacitor.Plugins &&
      window.Capacitor.Plugins.AdMob
    );
  }

  function isNative() {
    return !!(
      window.Capacitor &&
      typeof window.Capacitor.isNativePlatform === "function" &&
      window.Capacitor.isNativePlatform()
    );
  }

  function rewardedId() {
    const platform =
      (window.Capacitor &&
        typeof window.Capacitor.getPlatform === "function" &&
        window.Capacitor.getPlatform()) ||
      "web";
    return platform === "ios"
      ? ADMOB_CONFIG.rewardedIos
      : ADMOB_CONFIG.rewardedAndroid;
  }

  function isPremium() {
    return localStorage.getItem(PREMIUM_KEY) === "1";
  }

  function setPremium(on) {
    if (on) localStorage.setItem(PREMIUM_KEY, "1");
    else localStorage.removeItem(PREMIUM_KEY);
  }

  async function init() {
    if (initialized || !isNative()) return;
    const ad = admob();
    if (!ad || typeof ad.initialize !== "function") return;
    try {
      await ad.initialize({ initializeForTesting: ADMOB_CONFIG.isTesting });
      initialized = true;
    } catch (e) {
      // Leave uninitialized; rewarded calls will simply report unavailable.
    }
  }

  // Whether an opt-in rewarded ad could actually be shown right now. Premium
  // players never need ads — their bonuses are granted directly — so we report
  // "available" for them too (the caller grants the reward without a video).
  function canReward() {
    return isPremium() || (isNative() && !!admob());
  }

  // Show a rewarded ad (or, for premium players, grant immediately). Resolves
  // to true when the reward should be granted, false when nothing happened.
  async function showRewarded() {
    if (isPremium()) return true;
    if (!isNative()) return false;
    const ad = admob();
    if (!ad) return false;
    try {
      await init();
      if (typeof ad.prepareRewardVideoAd === "function") {
        await ad.prepareRewardVideoAd({
          adId: rewardedId(),
          isTesting: ADMOB_CONFIG.isTesting,
        });
        await ad.showRewardVideoAd();
        return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  }

  // Attempt the "Remove Ads / Premium" purchase. Real store wiring goes here;
  // until an IAP plugin + product are configured this reports failure (web/dev)
  // so the UI can show a friendly "not available" message.
  async function purchasePremium() {
    const iap =
      window.Capacitor &&
      window.Capacitor.Plugins &&
      (window.Capacitor.Plugins.InAppPurchase ||
        window.Capacitor.Plugins.Purchases);
    if (!isNative() || !iap) return false;
    try {
      // TODO: replace with the real product purchase call for your IAP plugin.
      // const res = await iap.purchaseProduct({ productId: "remove_ads" });
      // if (res && res.success) { setPremium(true); return true; }
      return false;
    } catch (e) {
      return false;
    }
  }

  // Restore a previously bought premium entitlement.
  async function restorePurchases() {
    const iap =
      window.Capacitor &&
      window.Capacitor.Plugins &&
      (window.Capacitor.Plugins.InAppPurchase ||
        window.Capacitor.Plugins.Purchases);
    if (!isNative() || !iap) return false;
    try {
      // TODO: query the store for an owned "premium" entitlement and, if found,
      // setPremium(true). Returns whether premium is now active.
      return isPremium();
    } catch (e) {
      return false;
    }
  }

  return {
    init,
    isPremium,
    setPremium,
    canReward,
    showRewarded,
    purchasePremium,
    restorePurchases,
  };
})();
