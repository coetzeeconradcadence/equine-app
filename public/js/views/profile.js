// Owner profile – a short one-time setup page for a new user (plus somewhere to edit it later
// from More → My profile or Settings). Stored as a single object in the 'meta' store via
// db.getSetting/setSetting('ownerProfile', …) rather than the generic record schemas, since
// there's only ever one of these per device, not a list.
//
// Kept deliberately light per onboarding UX research (Appcues' onboarding-patterns guide, among
// others): only a first name is required, everything else – including the whole "where your
// horses are kept" section – can be skipped and filled in later, so a new user can get straight
// to adding a horse if they'd rather. https://www.appcues.com/blog/user-onboarding-ui-ux-patterns
import { html } from '../util.js';
import { APP } from '../config.js';
import * as db from '../db.js';

export async function profileSetupView() {
  const [p, horses] = await Promise.all([db.getSetting('ownerProfile'), db.all('horses')]);
  const profile = p || {};
  const keeping = profile.keeping || 'Livery';
  const yardLabel = keeping === 'Own stables' ? 'What do you call your stables? (optional)' : 'Livery yard name';
  const isFirstRun = !horses.length;
  return html`
    <div class="page-head"><h1>👤 ${profile.firstName ? 'Your profile' : `Welcome to ${APP.name}`}</h1></div>
    <p class="muted">${isFirstRun
      ? 'A few details to personalise things and get your yard set up. This stays on this device only – takes under a minute, and you can skip it and come back later.'
      : 'Update your details any time – this stays on this device only.'}</p>
    <form id="profile-form" novalidate data-first-run="${isFirstRun ? '1' : ''}">
      <div class="card">
        <h2>About you</h2>
        <div class="form-grid">
          <div class="field"><label for="pf_firstName">First name *</label><input id="pf_firstName" name="firstName" required value="${profile.firstName || ''}" placeholder="e.g. Conrad"></div>
          <div class="field"><label for="pf_lastName">Surname</label><input id="pf_lastName" name="lastName" value="${profile.lastName || ''}"></div>
          <div class="field"><label for="pf_email">Email</label><input id="pf_email" name="email" type="email" value="${profile.email || ''}"></div>
          <div class="field"><label for="pf_phone">Cell number</label><input id="pf_phone" name="phone" type="tel" value="${profile.phone || ''}" placeholder="e.g. 082 123 4567"></div>
        </div>
      </div>

      <div class="card" style="margin-top:12px">
        <h2>Where your horses are kept</h2>
        <div class="form-grid">
          <div class="field full"><label for="pf_address">Yard address</label><textarea id="pf_address" name="address" rows="2" placeholder="Street, suburb / town">${profile.address || ''}</textarea></div>
          <div class="field full"><label>Keeping arrangement</label>
            <div class="checks">
              <label><input type="radio" name="keeping" value="Own stables" ${keeping === 'Own stables' ? 'checked' : ''}> 🏠 Own stables / private property</label>
              <label><input type="radio" name="keeping" value="Livery" ${keeping === 'Livery' ? 'checked' : ''}> 🐎 Livery / boarding at another yard</label>
            </div>
          </div>
          <div class="field"><label for="pf_yard" id="pf_yard_label">${yardLabel}</label><input id="pf_yard" name="yard" value="${profile.yard || ''}" placeholder="e.g. Kyalami Equestrian Park"></div>
          <div class="field"><label for="pf_trainer">Trainer / coach (if any)</label><input id="pf_trainer" name="trainer" value="${profile.trainer || ''}" placeholder="e.g. Jane Smith"></div>
        </div>
      </div>

      <div class="row" style="margin-top:14px">
        <button type="submit" class="primary">${isFirstRun ? 'Save & add my first horse' : 'Save profile'}</button>
        <button type="button" data-action="skip-profile">${isFirstRun ? 'Skip for now' : 'Cancel'}</button>
      </div>
    </form>`;
}
