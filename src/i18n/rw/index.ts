import { common } from './common';
import { landing } from './landing';
import { guest } from './guest';
import { auth } from './auth';
import { shop } from './shop';
import { checkout } from './checkout';
import { orders } from './orders';
import { wallet } from './wallet';
import { subscription } from './subscription';
import { more } from './more';
import { affiliators } from './affiliators';
import { settings } from './settings';
import { notifications } from './notifications';
import { market } from './market';
import { voucherConsent } from './voucherConsent';
import { menuGenerator } from './menuGenerator';
import { chat } from './chat';

export const rw = {
  ...common,
  ...landing,
  ...guest,
  ...auth,
  ...shop,
  ...checkout,
  ...orders,
  ...wallet,
  ...subscription,
  ...more,
  ...affiliators,
  ...settings,
  ...notifications,
  ...market,
  ...voucherConsent,
  ...menuGenerator,
  ...chat,
};
