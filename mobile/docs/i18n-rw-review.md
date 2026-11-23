# Kinyarwanda (rw) translation review

Every Kinyarwanda string in the app is a **machine-assisted draft** until a native speaker approves it.
This file lists each key with its English source and the current draft, grouped by the locale file it lives in
(`src/i18n/locales/rw/<namespace>.json`).

**How to review**

1. Read the English source and the draft. Correct the draft directly in `src/i18n/locales/rw/<namespace>.json`.
2. Keep every `{{placeholder}}` exactly as written (the parity test fails otherwise).
3. Mark the key as approved in `docs/i18n-rw-status.json` (`"status": "approved"`). The flag lives in that
   separate file, never inside the strings. If the English source changes later, the key goes back to
   "needs review" automatically when this file is regenerated.
4. Plurals: keys ending in `_one` / `_other` are the singular / plural forms.

**Terminology to settle first** (used across many strings)

| English | Draft term | Note |
|---|---|---|
| kitchen | igikoni | Some older strings use "igikoni" — pick one term and apply it everywhere. |
| ingredient | ikiribwa | Literally "material/tool"; confirm the best kitchen term. |
| portion | isahani | "plate"; confirm for counting portions sold. |
| delivery received | ibyakiriwe | Used for Log Delivery / receiving. |
| order (purchase) | itumiza | |
| archive (kitchen) | gushyingura | Confirm the wording for "archive". |
| AI | AI | Kept as the English acronym. |

Total keys: **1095** — status as generated: 0 approved,
1095 needing review.

## agent (130)

| Key | English source | Kinyarwanda draft | Status |
|---|---|---|---|
| `agent.title` | Kitchen Assistant | Umufasha w'igikoni | ⚠ needs review |
| `agent.openAssistant` | Open kitchen assistant | Fungura umufasha w'igikoni | ⚠ needs review |
| `agent.undo` | Undo | Subira | ⚠ needs review |
| `agent.imageAttached` | Photo attached — add a message or send it as is. | Ifoto yometseho — ongeraho ubutumwa cyangwa uyohereze uko iri. | ⚠ needs review |
| `agent.addContext` | Add a photo | Ongeraho ifoto | ⚠ needs review |
| `agent.assistantLabel` | Assistant | Umufasha | ⚠ needs review |
| `agent.confirmed` | Confirmed and executed | Byemejwe kandi byashyizwe mu bikorwa | ⚠ needs review |
| `agent.cancelled` | Cancelled | Byahagaritswe | ⚠ needs review |
| `agent.cancelAction` | Cancel | Hagarika | ⚠ needs review |
| `agent.confirmAction` | Confirm | Emeza | ⚠ needs review |
| `agent.fabHint` | Long-press to talk | Kanda igihe kirekire kugira ngo uvuge | ⚠ needs review |
| `agent.you` | You | Wowe | ⚠ needs review |
| `agent.photoSent` | Photo | Ifoto | ⚠ needs review |
| `agent.photoPrompt` | Please look at this photo. | Reba iyi foto. | ⚠ needs review |
| `agent.stockPhotoPrompt` | Help me count the stock in this photo. | Mfasha kubara ibiri mu bubiko kuri iyi foto. | ⚠ needs review |
| `agent.asOf` | Data as of {{time}} | Amakuru yo ku isaha {{time}} | ⚠ needs review |
| `agent.thinking` | Thinking… | Ndatekereza… | ⚠ needs review |
| `agent.stillWorking` | Still working… you can stop at any time. | Biracyakorwa… ushobora guhagarika igihe icyo ari cyo cyose. | ⚠ needs review |
| `agent.stopped` | Stopped. Nothing was changed. | Byahagaritswe. Nta cyahindutse. | ⚠ needs review |
| `agent.stop` | Stop | Hagarika | ⚠ needs review |
| `agent.send` | Send message | Ohereza ubutumwa | ⚠ needs review |
| `agent.attach` | Add a photo | Ongeraho ifoto | ⚠ needs review |
| `agent.removePhoto` | Remove photo | Kuraho ifoto | ⚠ needs review |
| `agent.files` | Files | Amadosiye | ⚠ needs review |
| `agent.attachHint` | Send a menu, a dish, a delivery note or a stock shelf. Text in photos is only read as data. | Ohereza menu, ifunguro, urupapuro rw'ibyakiriwe cyangwa akabati k'ububiko. Inyandiko ziri ku mafoto zisomwa nk'amakuru gusa. | ⚠ needs review |
| `agent.attachFailed` | Couldn't load that photo — try another one. | Iyi foto ntiyafunguwe — gerageza indi. | ⚠ needs review |
| `agent.cameraDenied` | Camera access is off. Allow it in Settings to take a photo. | Kamera ntiyemerewe. Yemerere mu Igenamiterere kugira ngo ufate ifoto. | ⚠ needs review |
| `agent.placeholder` | Ask, or tell me what to record… | Baza cyangwa umbwire icyo nandika… | ⚠ needs review |
| `agent.inputLabel` | Message to the kitchen assistant | Ubutumwa ku mufasha w'igikoni | ⚠ needs review |
| `agent.newChat` | New chat | Ikiganiro gishya | ⚠ needs review |
| `agent.newChatStarted` | New chat started | Ikiganiro gishya cyatangiye | ⚠ needs review |
| `agent.noKitchenTitle` | No kitchen selected | Nta gikoni cyatoranyijwe | ⚠ needs review |
| `agent.noKitchenBody` | Choose a kitchen so the assistant knows which stock and menu to use. | Hitamo igikoni kugira ngo umufasha amenye ububiko na menu akoresha. | ⚠ needs review |
| `agent.chooseKitchen` | Choose a kitchen | Hitamo igikoni | ⚠ needs review |
| `agent.loadingChat` | Loading chat… | Ikiganiro kirimo gufunguka… | ⚠ needs review |
| `agent.emptyTitle` | Hi! I'm the assistant for {{kitchen}} | Muraho! Ndi umufasha wa {{kitchen}} | ⚠ needs review |
| `agent.emptyBody` | Ask about stock, sales and food cost, or tell me what to record. I always ask before changing anything. | Mbaza ku bubiko, ibyagurishijwe n'ikiguzi cy'ibiribwa, cyangwa umbwire icyo nandika. Buri gihe ndabaza mbere yo guhindura ikintu. | ⚠ needs review |
| `agent.suggestions.title` | Try asking | Gerageza kubaza | ⚠ needs review |
| `agent.suggestions.lowStock` | What's running low? | Ni iki kiri hafi gushira? | ⚠ needs review |
| `agent.suggestions.recordSales` | Record today's sales | Andika ibyagurishijwe uyu munsi | ⚠ needs review |
| `agent.suggestions.foodCost` | What's my food cost on {{dish}}? | Ikiguzi cy'ibiribwa bya {{dish}} ni angahe? | ⚠ needs review |
| `agent.suggestions.foodCostAny` | Which dish has the highest food cost? | Ni irihe funguro rifite ikiguzi cy'ibiribwa kinini? | ⚠ needs review |
| `agent.manual.recordSales` | Record sales by hand | Andika ibyagurishijwe ubwawe | ⚠ needs review |
| `agent.manual.logDelivery` | Log a delivery by hand | Andika ibyakiriwe ubwawe | ⚠ needs review |
| `agent.route.menuTitle` | This looks like a menu. | Iyi isa na menu. | ⚠ needs review |
| `agent.route.menuBody` | Import its dishes? You'll review every item before anything is saved. | Winjiza amafunguro ayirimo? Uzagenzura buri kintu mbere y'uko hagira ikibikwa. | ⚠ needs review |
| `agent.route.menuAction` | Review menu items | Genzura ibiri kuri menu | ⚠ needs review |
| `agent.route.dishTitle` | This looks like a dish. | Iyi isa n'ifunguro. | ⚠ needs review |
| `agent.route.dishBody` | Add it as one menu item with AI suggestions for ingredients and price? | Urishyira kuri menu nk'ikintu kimwe, AI igusabira ibikoresho n'igiciro? | ⚠ needs review |
| `agent.route.dishAction` | Add this dish | Ongeraho iri funguro | ⚠ needs review |
| `agent.route.receiptTitle` | This looks like a receipt. | Iyi isa n'inyemezabuguzi. | ⚠ needs review |
| `agent.route.deliveryTitle` | This looks like a delivery note. | Iyi isa n'urupapuro rw'ibyakiriwe. | ⚠ needs review |
| `agent.route.deliveryBody` | Open Log Delivery with this photo? You'll check every line before saving. | Ufungura kwandika ibyakiriwe ukoresheje iyi foto? Uzagenzura buri murongo mbere yo kubika. | ⚠ needs review |
| `agent.route.deliveryAction` | Log this delivery | Andika ibi byakiriwe | ⚠ needs review |
| `agent.route.stockTitle` | This looks like a stock shelf. | Iyi isa n'akabati k'ububiko. | ⚠ needs review |
| `agent.route.stockBody` | I'll help you count it — every change needs your confirmation. | Ndagufasha kubibara — buri gihinduka gisaba ko ubyemeza. | ⚠ needs review |
| `agent.route.otherTitle` | I couldn't tell what this photo shows. | Sinamenye ibiri kuri iyi foto. | ⚠ needs review |
| `agent.route.otherBody` | Send a printed or handwritten menu, a single dish, a delivery note or a stock shelf, flat and well lit. | Ohereza menu icapye cyangwa yanditse n'intoki, ifunguro rimwe, urupapuro rw'ibyakiriwe cyangwa akabati k'ububiko, biri hasi kandi bibonesheje neza. | ⚠ needs review |
| `agent.voice.start` | Talk to the assistant | Vugisha umufasha | ⚠ needs review |
| `agent.voice.stop` | Stop recording and transcribe | Hagarika gufata amajwi maze bihindurwe inyandiko | ⚠ needs review |
| `agent.voice.cancel` | Cancel recording | Reka gufata amajwi | ⚠ needs review |
| `agent.voice.transcribing` | Transcribing… | Turimo kwandika ibyo wavuze… | ⚠ needs review |
| `agent.voice.recordingA11y` | Recording, {{seconds}} of {{max}} seconds | Gufata amajwi, amasegonda {{seconds}} kuri {{max}} | ⚠ needs review |
| `agent.voice.micDenied` | Microphone access is off. Allow it in Settings to talk to the assistant. | Mikoro ntiyemerewe. Yemerere mu Igenamiterere kugira ngo uvugishe umufasha. | ⚠ needs review |
| `agent.voice.noSpeech` | I didn't hear anything — try again a little closer to the phone. | Nta jwi numvise — ongera ugerageze wegereye telefoni. | ⚠ needs review |
| `agent.voice.unavailable` | Voice input is temporarily unavailable — please type. | Kuvuga ntibiboneka by'agateganyo — andika. | ⚠ needs review |
| `agent.voice.failed` | Couldn't record — try again or type your message. | Gufata amajwi byanze — ongera ugerageze cyangwa wandike. | ⚠ needs review |
| `agent.voice.languageUnavailable` | Voice input in English isn't available yet — please type. | Kuvugisha ijwi mu Kinyarwanda ntibirashoboka — andika ubutumwa bwawe. | ⚠ needs review |
| `agent.card.kicker` | Action — needs your OK | Igikorwa — gikeneye uruhushya rwawe | ⚠ needs review |
| `agent.card.kickerEdited` | Action — edited by you | Igikorwa — wagihinduye | ⚠ needs review |
| `agent.card.a11y` | Proposed action: {{title}} | Igikorwa gisabwa: {{title}} | ⚠ needs review |
| `agent.card.today` | today | uyu munsi | ⚠ needs review |
| `agent.card.title.recordSale` | Record {{portions}} × {{name}} sold | Andika ko hagurishijwe {{portions}} × {{name}} | ⚠ needs review |
| `agent.card.title.inventorySet` | Set {{name}} stock to {{quantity}} {{unit}} | Shyira ububiko bwa {{name}} kuri {{quantity}} {{unit}} | ⚠ needs review |
| `agent.card.title.inventoryAdd` | Add {{quantity}} {{unit}} of {{name}} to stock | Ongera {{quantity}} {{unit}} bya {{name}} mu bubiko | ⚠ needs review |
| `agent.card.title.inventoryRemove` | Remove {{quantity}} {{unit}} of {{name}} from stock | Kuramo {{quantity}} {{unit}} bya {{name}} mu bubiko | ⚠ needs review |
| `agent.card.title.createIngredient` | Create ingredient {{name}} ({{unit}}) | Kora ikiribwa {{name}} ({{unit}}) | ⚠ needs review |
| `agent.card.title.addMenuItem` | Add {{name}} to the menu at {{price}} | Ongera {{name}} kuri menu ku giciro cya {{price}} | ⚠ needs review |
| `agent.card.title.linkRecipe` | Use {{quantity}} {{unit}} of {{ingredient}} per portion of {{dish}} | Koresha {{quantity}} {{unit}} bya {{ingredient}} ku isahani ya {{dish}} | ⚠ needs review |
| `agent.card.title.createOrder_one` | Create an order with {{count}} item | Kora itumiza ry'ikintu {{count}} | ⚠ needs review |
| `agent.card.title.createOrder_other` | Create an order with {{count}} items | Kora itumiza ry'ibintu {{count}} | ⚠ needs review |
| `agent.card.title.submitOrder` | Submit order {{ref}} | Ohereza itumiza {{ref}} | ⚠ needs review |
| `agent.card.title.cancelOrder` | Cancel order {{ref}} | Hagarika itumiza {{ref}} | ⚠ needs review |
| `agent.card.title.startDelivery` | Start receiving order {{ref}} | Tangira kwakira itumiza {{ref}} | ⚠ needs review |
| `agent.card.title.receiveDelivery_one` | Receive {{count}} line for order {{ref}} | Akira umurongo {{count}} w'itumiza {{ref}} | ⚠ needs review |
| `agent.card.title.receiveDelivery_other` | Receive {{count}} lines for order {{ref}} | Akira imirongo {{count}} y'itumiza {{ref}} | ⚠ needs review |
| `agent.card.title.undo` | Undo: {{description}} | Subiza inyuma: {{description}} | ⚠ needs review |
| `agent.card.dish` | Dish | Ifunguro | ⚠ needs review |
| `agent.card.portions` | Portions | Amasahani | ⚠ needs review |
| `agent.card.date` | Date | Itariki | ⚠ needs review |
| `agent.card.ingredient` | Ingredient | Ikiribwa | ⚠ needs review |
| `agent.card.change` | Change | Impinduka | ⚠ needs review |
| `agent.card.quantity` | Quantity | Ingano | ⚠ needs review |
| `agent.card.note` | Note | Icyitonderwa | ⚠ needs review |
| `agent.card.name` | Name | Izina | ⚠ needs review |
| `agent.card.unit` | Unit | Igipimo | ⚠ needs review |
| `agent.card.price` | Price | Igiciro | ⚠ needs review |
| `agent.card.category` | Category | Icyiciro | ⚠ needs review |
| `agent.card.perPortion` | Per portion | Ku isahani | ⚠ needs review |
| `agent.card.deliveryDate` | Delivery date | Itariki yo kugeza | ⚠ needs review |
| `agent.card.order` | Order | Itumiza | ⚠ needs review |
| `agent.card.changeTypes.set` | Counted stock (set) | Ibyabazwe (shyiraho) | ⚠ needs review |
| `agent.card.changeTypes.add` | Add to stock | Ongera mu bubiko | ⚠ needs review |
| `agent.card.changeTypes.remove` | Remove from stock | Kuramo mu bubiko | ⚠ needs review |
| `agent.card.decisions.accepted` | accepted | byakiriwe | ⚠ needs review |
| `agent.card.decisions.partial` | partly accepted | byakiriwe igice | ⚠ needs review |
| `agent.card.decisions.rejected` | rejected | byanzwe | ⚠ needs review |
| `agent.card.errors.required` | Required | Birakenewe | ⚠ needs review |
| `agent.card.errors.number` | Enter a number | Andika umubare | ⚠ needs review |
| `agent.card.errors.wholeNumber` | Enter a whole number | Andika umubare wuzuye | ⚠ needs review |
| `agent.card.errors.min` | Must be at least {{min}} | Ntigomba kujya munsi ya {{min}} | ⚠ needs review |
| `agent.card.errors.positive` | Must be more than 0 | Igomba kurenza 0 | ⚠ needs review |
| `agent.card.errors.tooLong` | Too long | Ni birebire cyane | ⚠ needs review |
| `agent.card.done` | Done — saved. | Byakozwe — byabitswe. | ⚠ needs review |
| `agent.card.cancelled` | Cancelled — nothing was changed. | Byahagaritswe — nta cyahindutse. | ⚠ needs review |
| `agent.card.failed` | Couldn't save — nothing was changed. Try again. | Kubika byanze — nta cyahindutse. Ongera ugerageze. | ⚠ needs review |
| `agent.card.failedOffline` | No connection — try again when you're back online. It won't be saved twice. | Nta murandasi — ongera ugerageze ugarutse ku murandasi. Ntibizabikwa kabiri. | ⚠ needs review |
| `agent.card.failedConflict` | This was already done, or it changed in the meantime. | Ibi byari byarakozwe, cyangwa byahindutse hagati aho. | ⚠ needs review |
| `agent.card.failedInvalid` | The server didn't accept these values — edit them and try again. | Seriveri ntiyemeye aya makuru — yahindure wongere ugerageze. | ⚠ needs review |
| `agent.card.failedNotFound` | That item no longer exists. | Icyo kintu nticyakibaho. | ⚠ needs review |
| `agent.card.cancel` | Cancel | Hagarika | ⚠ needs review |
| `agent.card.edit` | Edit | Hindura | ⚠ needs review |
| `agent.card.confirm` | Confirm | Emeza | ⚠ needs review |
| `agent.card.retry` | Try again | Ongera ugerageze | ⚠ needs review |
| `agent.card.cancelA11y` | Cancel: {{title}} | Hagarika: {{title}} | ⚠ needs review |
| `agent.card.editA11y` | Edit: {{title}} | Hindura: {{title}} | ⚠ needs review |
| `agent.card.confirmA11y` | Confirm: {{title}} | Emeza: {{title}} | ⚠ needs review |
| `agent.card.discardEdit` | Discard changes | Reka impinduka | ⚠ needs review |
| `agent.card.saveEdit` | Save changes | Bika impinduka | ⚠ needs review |
| `agent.card.converted` | Converted | Byahinduwe | ⚠ needs review |

## ai (79)

| Key | English source | Kinyarwanda draft | Status |
|---|---|---|---|
| `ai.badge` | AI | AI | ⚠ needs review |
| `ai.retry` | Try again | Ongera ugerageze | ⚠ needs review |
| `ai.enterManually` | Enter manually | Andika ubwawe | ⚠ needs review |
| `ai.unavailable` | AI is temporarily unavailable. You can still fill everything in by hand. | AI ntiboneka by'agateganyo. Ushobora kwiyandikira byose. | ⚠ needs review |
| `ai.estimateWarning` | AI estimate — check quantities and price before saving. | Igereranya rya AI — genzura ingano n'igiciro mbere yo kubika. | ⚠ needs review |
| `ai.status.preparing` | Preparing photo… | Turimo gutegura ifoto… | ⚠ needs review |
| `ai.status.uploading` | Uploading photo… {{percent}}% | Ifoto iroherezwa… {{percent}}% | ⚠ needs review |
| `ai.status.analysing` | Analysing… | Turimo gusesengura… | ⚠ needs review |
| `ai.status.usuallyTakes` | Usually takes about 5–10 seconds. | Ubusanzwe bimara amasegonda 5–10. | ⚠ needs review |
| `ai.status.stillWorking` | Still working… | Biracyakorwa… | ⚠ needs review |
| `ai.status.retryingIn` | Retrying in {{seconds}} s. | Turongera kugerageza mu masegonda {{seconds}}. | ⚠ needs review |
| `ai.errors.offline` | No connection — we'll retry when you're back online. | Nta murandasi — tuzongera kugerageza nugaruka ku murandasi. | ⚠ needs review |
| `ai.errors.timeout` | This took too long — try again. | Byatwaye igihe kirekire — ongera ugerageze. | ⚠ needs review |
| `ai.errors.cancelled` | Cancelled. | Byahagaritswe. | ⚠ needs review |
| `ai.errors.unavailable` | AI is temporarily unavailable. You can still enter details manually. | AI ntiboneka by'agateganyo. Ushobora kwiyandikira amakuru. | ⚠ needs review |
| `ai.errors.rate_limited` | Too many AI requests today — try again later or enter details manually. | Wasabye AI inshuro nyinshi uyu munsi — ongera ugerageze nyuma cyangwa wiyandikire. | ⚠ needs review |
| `ai.errors.too_large` | This photo is too large — try another photo. | Iyi foto ni nini cyane — gerageza indi foto. | ⚠ needs review |
| `ai.errors.too_dark` | Photo too dark — try more light. | Ifoto yijimye cyane — ongera urumuri. | ⚠ needs review |
| `ai.errors.blurry` | Photo is blurry — hold steady and retake it. | Ifoto ntigaragara neza — fata telefoni neza wongere uyifate. | ⚠ needs review |
| `ai.errors.bad_output` | The AI answer could not be read — try again or enter details manually. | Igisubizo cya AI nticyasomwe — ongera ugerageze cyangwa wiyandikire. | ⚠ needs review |
| `ai.errors.auth` | Your session expired — sign in again. | Igihe cyawe cyarangiye — ongera winjire. | ⚠ needs review |
| `ai.errors.server` | Something went wrong — try again. | Hari ikitagenze neza — ongera ugerageze. | ⚠ needs review |
| `ai.errors.too_small` | The menu or document is too small in the photo — move closer. | Menu cyangwa urupapuro ni bito cyane ku ifoto — egera hafi. | ⚠ needs review |
| `ai.errors.refused` | I can't help with that. Try asking about your menu, stock, sales or deliveries. | Sinshobora kugufasha kuri ibyo. Gerageza kubaza ibijyanye na menu, ububiko, ibyagurishijwe cyangwa ibyakiriwe. | ⚠ needs review |
| `ai.errors.interrupted` | Response interrupted. Tap Retry to ask again. | Igisubizo cyahagaze. Kanda Ongera ugerageze kugira ngo wongere ubaze. | ⚠ needs review |
| `ai.consent.title` | AI help with photos and voice | Ubufasha bwa AI ku mafoto n'amajwi | ⚠ needs review |
| `ai.consent.body` | Photos and voice clips you send are processed by an AI service to read menus, dishes and delivery notes. Food Bundles does not keep them after processing. Nothing is saved without your confirmation. | Amafoto n'amajwi wohereza asesengurwa na serivisi ya AI kugira ngo isome menu, amafunguro n'impapuro z'ibyakiriwe. Food Bundles ntibibika nyuma yo kubisesengura. Nta kibikwa utabyemeje. | ⚠ needs review |
| `ai.consent.accept` | Continue | Komeza | ⚠ needs review |
| `ai.consent.decline` | Not now | Si ubu | ⚠ needs review |
| `ai.consent.policy` | Privacy policy | Politiki y'ibanga | ⚠ needs review |
| `ai.photoKind.title` | What is this photo? | Iyi foto ni iki? | ⚠ needs review |
| `ai.photoKind.body` | We couldn't tell automatically. Pick one to continue. | Ntitwabashije kubimenya ubwacu. Hitamo kimwe ukomeze. | ⚠ needs review |
| `ai.photoKind.menu` | Menu | Menu | ⚠ needs review |
| `ai.photoKind.dish` | Dish | Ifunguro | ⚠ needs review |
| `ai.photoKind.delivery_note` | Delivery note | Urupapuro rw'ibyakiriwe | ⚠ needs review |
| `clarify.currency_missing.question` | Prices have no currency. Which is it? | Ibiciro nta faranga bigaragaza. Ni irihe? | ⚠ needs review |
| `clarify.currency_ambiguous.question` | "{{example}}": which currency is it? | "{{example}}": ni ayahe mafaranga? | ⚠ needs review |
| `clarify.currency_mismatch.question` | These prices are in {{currency}}. Your kitchen uses {{kitchen_currency}}. | Ibi biciro biri mu {{currency}}. Igikoni cyawe gikoresha {{kitchen_currency}}. | ⚠ needs review |
| `clarify.ambiguous_separator.question` | Is "{{example}}" a whole number or a decimal? | "{{example}}" ni umubare wuzuye cyangwa ufite ibice? | ⚠ needs review |
| `clarify.k_suffix.question` | Does "{{example}}" mean {{amount}}? | "{{example}}" bivuga {{amount}}? | ⚠ needs review |
| `clarify.ambiguous_unit.us_or_uk` | Is "{{unit}}" a US or a UK (imperial) measure? | "{{unit}}" ni igipimo cyo muri Amerika cyangwa cyo mu Bwongereza? | ⚠ needs review |
| `clarify.ambiguous_unit.pack_size` | How much is in one "{{unit}}"? | Muri "{{unit}}" imwe harimo angahe? | ⚠ needs review |
| `clarify.arithmetic_mismatch.line_arithmetic` | Line {{row}} ({{label}}): {{quantity}} × {{unit_price}} = {{expected}}, but it says {{printed}}. | Umurongo {{row}} ({{label}}): {{quantity}} × {{unit_price}} = {{expected}}, ariko handitse {{printed}}. | ⚠ needs review |
| `clarify.arithmetic_mismatch.subtotal_mismatch` | The lines add up to {{expected}}, but the subtotal says {{printed}}. | Imirongo yose hamwe ni {{expected}}, ariko igiteranyo gito kivuga {{printed}}. | ⚠ needs review |
| `clarify.arithmetic_mismatch.total_mismatch` | The lines, tax and fees add up to {{expected}}, but the total says {{printed}}. | Imirongo, imisoro n'amafaranga y'inyongera bingana na {{expected}}, ariko igiteranyo kivuga {{printed}}. | ⚠ needs review |
| `clarify.arithmetic_mismatch.words_mismatch` | The total in words reads {{expected}}, but the figures say {{printed}}. | Igiteranyo cyanditse mu magambo kivuga {{expected}}, ariko imibare ivuga {{printed}}. | ⚠ needs review |
| `clarify.unreadable_value.question` | I couldn't read the price of "{{name}}" ({{text}}). | Sinashoboye gusoma igiciro cya "{{name}}" ({{text}}). | ⚠ needs review |
| `clarify.option.kitchen_currency` | {{currency}} (your kitchen) | {{currency}} (igikoni cyawe) | ⚠ needs review |
| `clarify.option.currency` | {{currency}} | {{currency}} | ⚠ needs review |
| `clarify.option.other_currency` | Other currency… | Andi mafaranga… | ⚠ needs review |
| `clarify.option.amount` | {{amount}} | {{amount}} | ⚠ needs review |
| `clarify.option.yes` | Yes | Yego | ⚠ needs review |
| `clarify.option.no` | No | Oya | ⚠ needs review |
| `clarify.option.convert` | Convert at 1 {{from}} = {{rate}} {{to}} ({{date}}) | Hindura ku 1 {{from}} = {{rate}} {{to}} ({{date}}) | ⚠ needs review |
| `clarify.option.convert_disabled` | Convert to {{to}} | Hindura mu {{to}} | ⚠ needs review |
| `clarify.option.change_kitchen_currency` | Change the kitchen currency to {{currency}} | Hindura ifaranga ry'igikoni ribe {{currency}} | ⚠ needs review |
| `clarify.option.skip_prices` | Import without these prices | Injiza nta biciro | ⚠ needs review |
| `clarify.option.type_it` | Type it | Byandike | ⚠ needs review |
| `clarify.option.skip` | Skip | Simbuka | ⚠ needs review |
| `clarify.option.keep_amount` | Keep {{amount}} | Gumana {{amount}} | ⚠ needs review |
| `clarify.option.us` | US | Amerika | ⚠ needs review |
| `clarify.option.uk` | UK (imperial) | Ubwongereza | ⚠ needs review |
| `clarify.option.pack_size` | Size of one pack | Ibiri mu gipfunyika kimwe | ⚠ needs review |
| `clarify.option.keep_unit` | Keep the unit as written | Gumana igipimo uko cyanditse | ⚠ needs review |
| `clarify.option.keep_printed` | Keep as printed | Bigumane uko byanditse | ⚠ needs review |
| `clarify.option.edit` | Edit the line | Hindura umurongo | ⚠ needs review |
| `clarify.option.apply` | Apply | Emeza | ⚠ needs review |
| `clarify.reason.rate_unavailable` | No exchange rate from the last 3 days. | Nta gipimo cy'ivunjisha cy'iminsi 3 ishize. | ⚠ needs review |
| `clarify.reason.conversion_off` | Currency conversion is not available for this kitchen yet. | Guhindura amafaranga ntibirashoboka kuri iki gikoni. | ⚠ needs review |
| `clarify.remaining_one` | {{count}} question left | Hasigaye ikibazo {{count}} | ⚠ needs review |
| `clarify.remaining_other` | {{count}} questions left | Hasigaye ibibazo {{count}} | ⚠ needs review |
| `clarify.packSizePlaceholder` | e.g. 50 kg | urugero: 50 kg | ⚠ needs review |
| `clarify.packSizeInvalid` | Type a number and a unit, e.g. 50 kg. | Andika umubare n'igipimo, urugero 50 kg. | ⚠ needs review |
| `clarify.applying` | Applying your answer… | Turimo gushyiraho igisubizo cyawe… | ⚠ needs review |
| `clarify.pickCurrency` | Choose the currency | Hitamo ifaranga | ⚠ needs review |
| `clarify.skipAll` | Skip the questions | Simbuka ibibazo | ⚠ needs review |
| `clarify.skipAllHint` | Rows with an open question keep an empty price for you to type. | Imirongo ifite ikibazo kitarasubizwa izaguma nta giciro, ukacyandika. | ⚠ needs review |
| `clarify.arithmeticFlag` | Some lines do not add up. Nothing was changed: check them before saving. | Imirongo imwe ntihura. Nta cyahinduwe: yigenzure mbere yo kubika. | ⚠ needs review |
| `clarify.converted` | {{original}} at 1 {{from}} = {{rate}} {{to}} ({{date}}) | {{original}} ku 1 {{from}} = {{rate}} {{to}} ({{date}}) | ⚠ needs review |

## auth (32)

| Key | English source | Kinyarwanda draft | Status |
|---|---|---|---|
| `auth.welcome` | Food Bundles Chef | Food Bundles Chef | ⚠ needs review |
| `auth.badge` | Chef App | Chef App | ⚠ needs review |
| `auth.headline` | Run your<br>kitchen<br>smarter. | Gucunga<br>ikaramu<br>yawe neza. | ⚠ needs review |
| `auth.tagline` | Order right. Receive right. Know your stock before service. | Gura neza. Sobanukirwa ibikuya. Menya ibiri mu bubiko. | ⚠ needs review |
| `auth.taglineSub` | Order right. Receive right.<br>Know your stock before service. | Gura neza. Sobanukirwa ibikuya.<br>Menya ibiri mu bubiko. | ⚠ needs review |
| `auth.hint` | For restaurants, hotels & schools in Rwanda | Ku mahoteli, inzu z'inzu n'amashuri mu Rwanda | ⚠ needs review |
| `auth.getStarted` | Get Started  → | Tangira  → | ⚠ needs review |
| `auth.signIn` | Sign in | Injira | ⚠ needs review |
| `auth.enterPhone` | Enter your phone | Injiza nimero ya telefoni | ⚠ needs review |
| `auth.smsSub` | We'll send you a one-time code to verify your number. | Tuzakohererezako kode imwe kugirango twemeze nimero yawe. | ⚠ needs review |
| `auth.phoneLabel` | Phone Number | Nimero ya Telefoni | ⚠ needs review |
| `auth.phonePlaceholder` | +250 7XX XXX XXX | +250 7XX XXX XXX | ⚠ needs review |
| `auth.sendingCode` | Sending code… | Ohereza kode… | ⚠ needs review |
| `auth.continueButton` | Continue | Komeza | ⚠ needs review |
| `auth.phoneError` | Please enter a valid phone number. | Injiza nimero ya telefoni yemewe. | ⚠ needs review |
| `auth.verify` | Verify | Emeza | ⚠ needs review |
| `auth.enterCode` | Enter the code | Injiza kode | ⚠ needs review |
| `auth.codeSentTo` | Sent to | Yoherejwe kuri | ⚠ needs review |
| `auth.demoHint` | Demo: enter any 6 digits | Demo: injiza imibare 6 | ⚠ needs review |
| `auth.verifying` | Verifying… | Gusuzuma… | ⚠ needs review |
| `auth.verifyButton` | Verify & Continue | Emeza & Komeza | ⚠ needs review |
| `auth.codeError` | Invalid code. Please try again. | Kode ntayo. Ongera ugerageze. | ⚠ needs review |
| `auth.phoneNumberLabel` | Phone number | Nimero ya telefoni | ⚠ needs review |
| `auth.otpLabel` | One-time code | Kode y'ibanga yoherejwe | ⚠ needs review |
| `auth.verifyCodeLabel` | Verify code | Emeza kode | ⚠ needs review |
| `auth.getStartedLabel` | Get started | Tangira | ⚠ needs review |
| `auth.features.purchasingTitle` | Smart purchasing | Kugura neza | ⚠ needs review |
| `auth.features.purchasingDesc` | Know what to buy before you run out | Menya icyo ugura mbere y'uko gishira | ⚠ needs review |
| `auth.features.receivingTitle` | Delivery receiving | Kwakira ibyagejejwe | ⚠ needs review |
| `auth.features.receivingDesc` | Check and log deliveries in seconds | Genzura kandi wandike ibyakiriwe mu masegonda | ⚠ needs review |
| `auth.features.insightsTitle` | Kitchen insights | Amakuru y'igikoni | ⚠ needs review |
| `auth.features.insightsDesc` | Live stock and sales at a glance | Ububiko n'ibyagurishijwe ako kanya | ⚠ needs review |

## common (43)

| Key | English source | Kinyarwanda draft | Status |
|---|---|---|---|
| `common.loading` | Loading… | Gutegereza… | ⚠ needs review |
| `common.error` | Something went wrong | Habaye ikibazo | ⚠ needs review |
| `common.retry` | Retry | Ongera ugerageze | ⚠ needs review |
| `common.cancel` | Cancel | Hagarika | ⚠ needs review |
| `common.confirm` | Confirm | Emeza | ⚠ needs review |
| `common.save` | Save | Bika | ⚠ needs review |
| `common.back` | Back | Subira | ⚠ needs review |
| `common.continue` | Continue | Komeza | ⚠ needs review |
| `common.done` | Done | Byarangiye | ⚠ needs review |
| `common.edit` | Edit | Hindura | ⚠ needs review |
| `common.delete` | Delete | Siba | ⚠ needs review |
| `common.archive` | Archive | Shyira mu bubiko | ⚠ needs review |
| `common.search` | Search | Shakisha | ⚠ needs review |
| `common.noResults` | No results found | Nta bisubizo byaboneka | ⚠ needs review |
| `common.add` | Add | Ongeraho | ⚠ needs review |
| `common.share` | Share | Sangira | ⚠ needs review |
| `common.close` | Close | Funga | ⚠ needs review |
| `common.tryAgain` | Try again | Ongera ugerageze | ⚠ needs review |
| `common.openSettings` | Open Settings | Fungura Igenamiterere | ⚠ needs review |
| `common.enable` | Enable | Fungura | ⚠ needs review |
| `common.seeAll` | See all | Reba byose | ⚠ needs review |
| `common.camera` | Camera | Kamera | ⚠ needs review |
| `common.gallery` | Gallery | Ububiko bw'amafoto | ⚠ needs review |
| `common.undo` | Undo | Subira inyuma | ⚠ needs review |
| `common.appName` | Food Bundles Chef | Food Bundles Chef | ⚠ needs review |
| `common.sync.saved` | Saved | Byabitswe | ⚠ needs review |
| `common.sync.pending` | Pending | Bitegereje | ⚠ needs review |
| `common.sync.pendingCount_one` | {{count}} change waiting to sync | Impinduka {{count}} itegereje guhuzwa | ⚠ needs review |
| `common.sync.pendingCount_other` | {{count}} changes waiting to sync | Impinduka {{count}} zitegereje guhuzwa | ⚠ needs review |
| `common.sync.syncing` | Syncing | Birimo guhuzwa | ⚠ needs review |
| `common.sync.failed` | Sync failed | Guhuza byanze | ⚠ needs review |
| `common.sync.conflict` | Conflict | Bivuguruzanya | ⚠ needs review |
| `common.searchPlaceholder` | Search… | Shakisha… | ⚠ needs review |
| `common.clearSearch` | Clear search | Siba ibyo washakishije | ⚠ needs review |
| `common.quantity` | Quantity | Ingano | ⚠ needs review |
| `common.decrease` | Decrease {{subject}} | Gabanya: {{subject}} | ⚠ needs review |
| `common.increase` | Increase {{subject}} | Ongera: {{subject}} | ⚠ needs review |
| `common.dismissDialog` | Close dialog | Funga idirishya | ⚠ needs review |
| `tabs.dashboard` | Dashboard | Ikibaho | ⚠ needs review |
| `tabs.menu` | Menu | Menu | ⚠ needs review |
| `tabs.purchasing` | Requisition | Kugura | ⚠ needs review |
| `tabs.stock` | Stock | Bubiko | ⚠ needs review |
| `tabs.profile` | Profile | Umwirondoro | ⚠ needs review |

## dashboard (50)

| Key | English source | Kinyarwanda draft | Status |
|---|---|---|---|
| `dashboard.title` | Dashboard | Ikibaho | ⚠ needs review |
| `dashboard.live` | LIVE | NONAHA | ⚠ needs review |
| `dashboard.switchKitchen` | Switch Kitchen | Hindura Igikoni | ⚠ needs review |
| `dashboard.activeKitchen` | Active Kitchen | Gutaraga Riri Gukoreshwa | ⚠ needs review |
| `dashboard.noKitchen` | No kitchen selected | Nta gutaraga ryatoranijwe | ⚠ needs review |
| `dashboard.lowStock` | Low Stock | Ibiciro Bike | ⚠ needs review |
| `dashboard.allStocked` | All stocked | Byose biri mu bubiko | ⚠ needs review |
| `dashboard.actionNeeded` | Action needed | Hakenewe igikorwa | ⚠ needs review |
| `dashboard.pendingOrders` | Requisitions | Ibyatumwe bitegerejwe | ⚠ needs review |
| `dashboard.deliveries` | Deliveries | Ibyoherejwe | ⚠ needs review |
| `dashboard.sales` | Sales | Ibyagurishijwe | ⚠ needs review |
| `dashboard.recentDeliveries` | Recent Deliveries | Ibyoherejwe Biheruka | ⚠ needs review |
| `dashboard.procurementReminder` | Procurement Reminder | Ibutsa ryo Kugura | ⚠ needs review |
| `dashboard.reviewPurchaseList` | Review Purchase List › | Reba Urutonde rw'Ibigura › | ⚠ needs review |
| `dashboard.alerts` | Alert | Imenyesha | ⚠ needs review |
| `dashboard.alertsPlural` | Alerts | Imenyesha | ⚠ needs review |
| `dashboard.seeAll` | See all | Reba byose | ⚠ needs review |
| `dashboard.catalog` | Catalog | Urutonde rw'ibicuruzwa | ⚠ needs review |
| `dashboard.catalogLoading` | Loading catalog… | Urutonde rw'ibicuruzwa rurimo gufunguka… | ⚠ needs review |
| `dashboard.catalogEmpty` | No products in catalog yet. | Nta bicuruzwa biri ku rutonde. | ⚠ needs review |
| `dashboard.browseCatalog` | Browse Catalog | Reba urutonde rw'ibicuruzwa | ⚠ needs review |
| `dashboard.viewFullCatalog` | View full catalog → | Reba urutonde rwose → | ⚠ needs review |
| `dashboard.allIngredientsStocked` | All ingredients are stocked. | Ibikoresho byose biri mu bubiko. | ⚠ needs review |
| `dashboard.onboardingAddMenu` | Add menu items | Ongeraho amafunguro | ⚠ needs review |
| `dashboard.onboardingAddMenuSub` | Set up your dishes and prices | Tegura amafunguro yawe n'ibiciro | ⚠ needs review |
| `dashboard.onboardingTrackIngredients` | Track ingredients | Kurikirana ibikoresho | ⚠ needs review |
| `dashboard.onboardingTrackIngredientsSub` | Add stock to monitor purchasing needs | Ongeraho ububiko kugira ngo umenye ibyo ukeneye kugura | ⚠ needs review |
| `dashboard.onboardingReceiveDelivery` | Receive a delivery | Akira ibyagejejwe | ⚠ needs review |
| `dashboard.onboardingReceiveDeliverySub` | Log an incoming supplier order | Andika ibyo umucuruzi yakugejejeho | ⚠ needs review |
| `dashboard.salesSub` | Tap to record today | Kanda wandike iby'uyu munsi | ⚠ needs review |
| `dashboard.quickActions` | Quick Actions | Ibikorwa byihuse | ⚠ needs review |
| `dashboard.qaReceive` | Receive | Kwakira | ⚠ needs review |
| `dashboard.qaReceiveSub` | Log delivery | Andika ibyakiriwe | ⚠ needs review |
| `dashboard.qaOrders` | Orders | Ibyatumwe | ⚠ needs review |
| `dashboard.qaOrdersSub` | Requisitions | Ibisabwa | ⚠ needs review |
| `dashboard.qaMenu` | Menu | Menu | ⚠ needs review |
| `dashboard.qaMenuSub` | Manage dishes | Gucunga amafunguro | ⚠ needs review |
| `dashboard.qaSales` | Sales | Ibyagurishijwe | ⚠ needs review |
| `dashboard.qaSalesSub` | Record sale | Andika igurishwa | ⚠ needs review |
| `dashboard.salesToday_one` | {{count}} portion today | Isahani {{count}} uyu munsi | ⚠ needs review |
| `dashboard.salesToday_other` | {{count}} portions today | Amasahani {{count}} uyu munsi | ⚠ needs review |
| `dashboard.lowStockAlert_one` | {{count}} ingredient is below 1 day of cover — reorder today. | Ikiribwa {{count}} gisigaje ububiko butagera ku munsi umwe — tumiza uyu munsi. | ⚠ needs review |
| `dashboard.lowStockAlert_other` | {{count}} ingredients are below 1 day of cover — reorder today. | Ibikoresho {{count}} bisigaje ububiko butagera ku munsi umwe — tumiza uyu munsi. | ⚠ needs review |
| `dashboard.alertsCount_one` | {{count}} alert | Integuza {{count}} | ⚠ needs review |
| `dashboard.alertsCount_other` | {{count}} alerts | Integuza {{count}} | ⚠ needs review |
| `dashboard.remaining` | {{qty}} {{unit}} left | Hasigaye {{qty}} {{unit}} | ⚠ needs review |
| `dashboard.reorderBody_one` | {{count}} ingredient is below the reorder level. Your purchase list is ready to review before tomorrow's service. | Ikiribwa {{count}} kiri munsi y'urugero rwo gutumiza. Urutonde rwawe rwo kugura rwiteguye kugenzurwa mbere y'akazi k'ejo. | ⚠ needs review |
| `dashboard.reorderBody_other` | {{count}} ingredients are below the reorder level. Your purchase list is ready to review before tomorrow's service. | Ibikoresho {{count}} biri munsi y'urugero rwo gutumiza. Urutonde rwawe rwo kugura rwiteguye kugenzurwa mbere y'akazi k'ejo. | ⚠ needs review |
| `dashboard.catalogItemLabel` | {{name}} — open the catalog | {{name}} — fungura urutonde rw'ibicuruzwa | ⚠ needs review |
| `dashboard.pricePerUnit` | {{price}}/{{unit}} | {{price}}/{{unit}} | ⚠ needs review |

## delivery (164)

| Key | English source | Kinyarwanda draft | Status |
|---|---|---|---|
| `receiving.title` | Log Delivery | Andika ibibukuwe | ⚠ needs review |
| `receiving.supplierLabel` | Supplier Name | Izina ry'umuguzi | ⚠ needs review |
| `receiving.supplierPlaceholder` | e.g. Kigali Fresh Market | urugero. Isoko Nshya ya Kigali | ⚠ needs review |
| `receiving.kitchenError` | Please select a kitchen first. | Banza hitamo igataraga. | ⚠ needs review |
| `receiving.itemsError` | Add at least one item with a quantity. | Ongeraho nibura ibintu rimwe hamwe n'ingano. | ⚠ needs review |
| `receiving.itemsReceived` | Items Received ({{count}}) | Ibintu byakiriwe ({{count}}) | ⚠ needs review |
| `receiving.addFromCatalog` | Add from Catalog | Ongeraho ibicuruzwa | ⚠ needs review |
| `receiving.addCustomItem` | Add custom item | Ongeraho ibintu byihariye | ⚠ needs review |
| `receiving.trackOnMap` | Track on Map | Kurikira kuri mapu | ⚠ needs review |
| `receiving.gpsRoute` | GPS route + share location | Inzira ya GPS + sangira aho uri | ⚠ needs review |
| `receiving.noCatalogItems` | No catalog items found | Nta bicuruzwa byabonetse | ⚠ needs review |
| `receiving.logDelivery` | Log Delivery | Andika ibibukuwe | ⚠ needs review |
| `receiving.loggingDelivery` | Logging Delivery… | Kwandika ibibukuwe… | ⚠ needs review |
| `receiving.addDeliveryPhoto` | Add delivery photo | Ongeraho ifoto y'ibibukuwe | ⚠ needs review |
| `receiving.retake` | Retake | Fata ubundi | ⚠ needs review |
| `receiving.quantity` | Quantity | Ingano | ⚠ needs review |
| `receiving.unit` | Unit | Ingero | ⚠ needs review |
| `receiving.pricePerUnit` | Price/unit | Igiciro/ingero | ⚠ needs review |
| `receiving.listTitle` | Receiving | Kwakira | ⚠ needs review |
| `receiving.logWalkIn` | Log walk-in delivery | Andika ibibukuwe byo kugenda | ⚠ needs review |
| `receiving.loadError` | Could not load deliveries. Check your connection and try again. | Kutagira uburyo bwo gutangira ibibukuwe. Reba itumanaho ukongere ugerageze. | ⚠ needs review |
| `receiving.expectedDeliveries` | Expected Deliveries | Ibibukuwe bitegerejwe | ⚠ needs review |
| `receiving.received` | Received | Byakiriwe | ⚠ needs review |
| `receiving.emptyTitle` | No deliveries yet | Nta bibukuwe kugeza ubu | ⚠ needs review |
| `receiving.emptyDesc` | Your incoming Food Bundles orders and walk-in deliveries will appear here, ready to log into stock. | Ibyatumwe byawe ya Food Bundles n'ibibukuwe byo kugenda bizagaragara hano. | ⚠ needs review |
| `receiving.emptyPlaceFirst` | Place an order first | Banza utange icyifuzo | ⚠ needs review |
| `receiving.emptyPlaceFirstDesc` | Browse the catalog, add products, and submit a requisition. It'll show here when confirmed. | Reba ibicuruzwa, ongeraho ibicuruzwa, hanyuma utange icyifuzo. | ⚠ needs review |
| `receiving.emptyWalkIn` | Log a walk-in delivery | Andika ibibukuwe byo kugenda | ⚠ needs review |
| `receiving.emptyWalkInDesc` | Got stock from a local supplier? Tap the + button above to record it and update your stock levels. | Wahawe ububiko n'umuguzi w'akarere? Kanda + hejuru kubiandika. | ⚠ needs review |
| `receiving.browseCatalogOrder` | Browse Catalog & Order | Reba ibicuruzwa utume | ⚠ needs review |
| `receiving.logWalkInDelivery` | Log Walk-in Delivery | Andika ibibukuwe byo kugenda | ⚠ needs review |
| `receiving.deliveryTitle` | Delivery | Ibibukuwe | ⚠ needs review |
| `receiving.deliveryNotFound` | Order not found. | Icyifuzo ntigibonetse. | ⚠ needs review |
| `receiving.deliveryLoadError` | Could not load order. Check your connection. | Kutagira uburyo bwo gutangira icyifuzo. Reba itumanaho. | ⚠ needs review |
| `receiving.startReceiving` | Start Receiving | Tangira kwakira | ⚠ needs review |
| `receiving.starting` | Starting… | Gutangira… | ⚠ needs review |
| `receiving.items` | Items ({{count}}) | Ibintu ({{count}}) | ⚠ needs review |
| `receiving.completeDelivery` | Complete Delivery | Rangiza ibibukuwe | ⚠ needs review |
| `receiving.completing` | Completing… | Kurangiza… | ⚠ needs review |
| `receiving.deliveryCompleted` | Delivery completed | Ibibukuwe byarangiye | ⚠ needs review |
| `receiving.startDeliveryError` | Could not start delivery. Please try again. | Kutagira uburyo bwo gutangira ibibukuwe. Ongera ugerageze. | ⚠ needs review |
| `receiving.completeDeliveryError` | Could not complete delivery. Please try again. | Kutagira uburyo bwo kurangiza ibibukuwe. Ongera ugerageze. | ⚠ needs review |
| `receiving.ordered` | Ordered: {{qty}} {{unit}} | Byasabwe: {{qty}} {{unit}} | ⚠ needs review |
| `receiving.receivedQty` | Received: {{qty}} {{unit}} | Byakiriwe: {{qty}} {{unit}} | ⚠ needs review |
| `receiving.shortDelivery` |  ⚠ Short delivery |  ⚠ Ibibukuwe bimaze | ⚠ needs review |
| `receiving.refPrice` | Ref: {{price}}/{{unit}} | Ref: {{price}}/{{unit}} | ⚠ needs review |
| `receiving.statusSubmitted` | Awaiting Delivery | Bitegerejwe ibibukuwe | ⚠ needs review |
| `receiving.statusConfirmed` | Pending | Bitegerejwe | ⚠ needs review |
| `receiving.statusOutForDelivery` | In Transit | Muri nzira | ⚠ needs review |
| `receiving.statusDelivered` | Delivered | Byakiriwe | ⚠ needs review |
| `receiving.receiveItemTitle` | Receive Item | Akira ikintu | ⚠ needs review |
| `receiving.itemNotFound` | Item not found. | Ikintu ntigibonetse. | ⚠ needs review |
| `receiving.cameraAccessTitle` | Camera Access Needed | Uburenganzira bwa kamera busabwa | ⚠ needs review |
| `receiving.cameraAccessDesc` | To assess delivery quality, the app needs camera access. You can also skip and enter values manually. | Kugira ngo usuzume imibare y'ibibukuwe, porogaramu isaba uburenganzira bwa kamera. | ⚠ needs review |
| `receiving.grantCamera` | Grant Camera Access | Tanga uburenganzira bwa kamera | ⚠ needs review |
| `receiving.skipManual` | Skip — Enter Manually | Simbuka — Injiza mu maboko | ⚠ needs review |
| `receiving.takePhotoOrGallery` | Take a photo or choose from gallery | Fata ifoto cyangwa hitamo mu biteramo | ⚠ needs review |
| `receiving.skipPhotoManual` | Skip Photo — Enter Manually | Simbuka ifoto — Injiza mu maboko | ⚠ needs review |
| `receiving.addNoteTitle` | Add Note to Photo | Ongeraho icyitonderwa kuri foto | ⚠ needs review |
| `receiving.addNoteOptional` | Add a note (optional) | Ongeraho icyitonderwa (ntibisabwa) | ⚠ needs review |
| `receiving.annotationPlaceholder` | e.g. 2 bags damaged, rest OK | urugero. Amasaho 2 yanangijwe, ahandi ni meza | ⚠ needs review |
| `receiving.annotationHint` | Your note will be shown on the photo and sent to AI as extra context. | Icyitonderwa cyawe kizagaragara kuri foto kandi cyoherezwa kuri AI. | ⚠ needs review |
| `receiving.assessWithAI` | Assess with AI | Suzuma na AI | ⚠ needs review |
| `receiving.skipAIManual` | Skip AI — Enter Manually | Simbuka AI — Injiza mu maboko | ⚠ needs review |
| `receiving.retakePhoto` | Retake Photo | Fata ifoto ubundi | ⚠ needs review |
| `receiving.aiRunning` | AI Assessment Running | Isuzuma rya AI riragenda | ⚠ needs review |
| `receiving.aiAdvisory` | Advisory only — you can override all values | Inama gusa — urashobora guhindura ibisubizo byose | ⚠ needs review |
| `receiving.aiAssessmentTitle` | AI Quality Assessment (Advisory) | Isuzuma ry'imibare na AI (inama) | ⚠ needs review |
| `receiving.aiEstimatedQty` | AI estimated quantity: | Ingano itangwa na AI: | ⚠ needs review |
| `receiving.aiNotVisible` | Not visible in image — enter manually | Ntiboneka mu ishusho — injiza mu maboko | ⚠ needs review |
| `receiving.enterValues` | Enter Values | Injiza ibitigiri | ⚠ needs review |
| `receiving.orderedLabel` | Ordered | Byasabwe | ⚠ needs review |
| `receiving.acceptedQtyLabel` | Accepted Quantity (actual) | Ingano yakiriwe (nyayo) | ⚠ needs review |
| `receiving.shortDeliveryWarning` | Short delivery: accepted is more than 5% below ordered. | Ibibukuwe bimaze: byakiriwe birenzeho 5% munsi y'ibyasabwe. | ⚠ needs review |
| `receiving.discrepancyLabel` | Discrepancy Reason (optional) | Impamvu y'itandukaniro (ntibisabwa) | ⚠ needs review |
| `receiving.discrepancyPlaceholder` | e.g. Two bags had visible mold | urugero. Amasaho abiri yari n'ubora | ⚠ needs review |
| `receiving.decisionLabel` | Decision | Icyemezo | ⚠ needs review |
| `receiving.accept` | Accept | Emera | ⚠ needs review |
| `receiving.partiallyAccept` | Partially Accept | Emera gato | ⚠ needs review |
| `receiving.reject` | Reject | Emera | ⚠ needs review |
| `receiving.imageTooLarge` | Image too large | Ifoto ni nini cyane | ⚠ needs review |
| `receiving.imageTooLargeDesc` | Could not compress image below 1 MB. Please try again. | Kutagira uburyo bwo gukandagira ifoto munsi ya 1 Mo. Ongera ugerageze. | ⚠ needs review |
| `receiving.cameraError` | Camera error | Ikosa rya kamera | ⚠ needs review |
| `receiving.cameraErrorDesc` | Could not capture photo. Please try again. | Kutagira uburyo bwo gufata ifoto. Ongera ugerageze. | ⚠ needs review |
| `receiving.permissionRequired` | Permission required | Uburenganzira busabwa | ⚠ needs review |
| `receiving.galleryPermissionDesc` | Gallery access is needed to upload a photo. | Uburenganzira bwo kwinjira mu biteramo busabwa kohereza ifoto. | ⚠ needs review |
| `receiving.uploadError` | Upload error | Ikosa ryo kohereza | ⚠ needs review |
| `receiving.uploadErrorDesc` | Could not load the selected photo. Please try again. | Kutagira uburyo bwo gutangira ifoto yatoranijwe. Ongera ugerageze. | ⚠ needs review |
| `receiving.imageTooLargeGallery` | Could not compress image below 1 MB. Please choose a smaller photo. | Kutagira uburyo bwo gukandagira ifoto munsi ya 1 Mo. Hitamo ifoto ntoya. | ⚠ needs review |
| `receiving.aiUnavailable` | AI assessment is unavailable. Please enter values manually. | Isuzuma rya AI ntiribonetse. Nyamuneka injiza ibitigiri mu maboko. | ⚠ needs review |
| `receiving.assessmentFailed` | Assessment failed. Please enter values manually. | Isuzuma ryanze. Nyamuneka injiza ibitigiri mu maboko. | ⚠ needs review |
| `receiving.mapTitle` | Delivery Map | Mapu y'ibibukuwe | ⚠ needs review |
| `receiving.locationRequired` | Location Access Required | Uburenganzira bwo kumenya aho uri busabwa | ⚠ needs review |
| `receiving.locationRequiredDesc` | Enable location in your device settings to use the delivery map. | Fungura uburenganzira bwo kumenya aho uri mu magenamiterere ya telefoni yawe. | ⚠ needs review |
| `receiving.goBack` | Go Back | Subira | ⚠ needs review |
| `receiving.gettingLocation` | Getting location… | Kumenya aho uri… | ⚠ needs review |
| `receiving.timeLabel` | Time | Igihe | ⚠ needs review |
| `receiving.distanceLabel` | Distance | Intera | ⚠ needs review |
| `receiving.pointsLabel` | Points | Amanota | ⚠ needs review |
| `receiving.tapMapHint` | Tap the map to drop a supplier pin, or start tracking your route | Kanda kuri mapu kugira ngo ushyireho amanota y'umuguzi cyangwa utangire gukurikira inzira | ⚠ needs review |
| `receiving.routeRecorded` | Route recorded — tap Start to track again | Inzira yabitswe — kanda Tangira kugira ngo ukurikire ubundi | ⚠ needs review |
| `receiving.startTrackingRoute` | Start Tracking Route | Tangira gukurikira inzira | ⚠ needs review |
| `receiving.trackingActive` | Tracking active — your route is being recorded | Gukurikira biragenda — inzira yawe irabitswa | ⚠ needs review |
| `receiving.stopTracking` | Stop Tracking | Hagarika gukurikira | ⚠ needs review |
| `receiving.doneBack` | Done — Back to Delivery | Byarangiye — Subira ku bibukuwe | ⚠ needs review |
| `receiving.chooseFromGallery` | Choose from gallery | Hitamo mu biteramo | ⚠ needs review |
| `receiving.takePhoto` | Take photo | Fata ifoto | ⚠ needs review |
| `receiving.centerOnMe` | Center on my location | Jya kuri aho ndi | ⚠ needs review |
| `receiving.shareLocation` | Share location | Sangira aho ndi | ⚠ needs review |
| `receiving.rowOrderPrefix` | Order | Icyifuzo | ⚠ needs review |
| `receiving.rowOrdered` | Ordered: | Byasabwe: | ⚠ needs review |
| `receiving.rowDelivered` | Delivered | Byakiriwe | ⚠ needs review |
| `receiving.rowExpected` | Expected | Bitegerejwe | ⚠ needs review |
| `receiving.rowReceivedOn` | Received | Byakiriwe | ⚠ needs review |
| `receiving.supplierNote` | Supplier: {{supplier}} | Umucuruzi: {{supplier}} | ⚠ needs review |
| `receiving.walkInNote` | Walk-in delivery | Ibyakiriwe bitatumijwe | ⚠ needs review |
| `receiving.ai.readPhoto` | Read items from this photo | Soma ibintu kuri iyi foto | ⚠ needs review |
| `receiving.ai.readPhotoSub` | AI fills in the lines — you check them before saving. | AI yuzuza imirongo — uyigenzura mbere yo kubika. | ⚠ needs review |
| `receiving.ai.noLines` | No items could be read — add them below. | Nta kintu cyasomwe — byongereho hepfo. | ⚠ needs review |
| `receiving.ai.notADocument` | This doesn't look like a delivery note or receipt — add the items below. | Iyi ntisa n'urupapuro rw'ibyakiriwe cyangwa inyemezabuguzi — ongeraho ibintu hepfo. | ⚠ needs review |
| `receiving.ai.added_one` | {{count}} line read from the photo — check it before saving. | Umurongo {{count}} wasomwe ku ifoto — uwugenzure mbere yo kubika. | ⚠ needs review |
| `receiving.ai.added_other` | {{count}} lines read from the photo — check each one before saving. | Imirongo {{count}} yasomwe ku ifoto — genzura buri murongo mbere yo kubika. | ⚠ needs review |
| `receiving.ai.checkLine` | Check this line | Genzura uyu murongo | ⚠ needs review |
| `receiving.ai.readByAi` | Read by AI | Byasomwe na AI | ⚠ needs review |
| `receiving.itemNameRequired` | Item name is required | Izina ry'ikintu rirakenewe | ⚠ needs review |
| `receiving.quantityRequired` | Enter a quantity above 0 | Andika ingano irenze 0 | ⚠ needs review |
| `receiving.loggedTitle` | Delivery logged | Ibyakiriwe byanditswe | ⚠ needs review |
| `receiving.loggedBodyFrom_one` | {{count}} item from {{supplier}} was added to stock. | Ikintu {{count}} cyavuye kwa {{supplier}} cyongewe mu bubiko. | ⚠ needs review |
| `receiving.loggedBodyFrom_other` | {{count}} items from {{supplier}} were added to stock. | Ibintu {{count}} byavuye kwa {{supplier}} byongewe mu bubiko. | ⚠ needs review |
| `receiving.loggedBody_one` | {{count}} item was added to stock. | Ikintu {{count}} cyongewe mu bubiko. | ⚠ needs review |
| `receiving.loggedBody_other` | {{count}} items were added to stock. | Ibintu {{count}} byongewe mu bubiko. | ⚠ needs review |
| `receiving.logError` | Couldn't log the delivery. Check your connection and try again — it won't be saved twice. | Kwandika ibyakiriwe byanze. Genzura murandasi wongere ugerageze — ntibizandikwa kabiri. | ⚠ needs review |
| `receiving.receiveTitle` | Receive delivery | Akira ibyagejejwe | ⚠ needs review |
| `receiving.cameraAccessBody` | Take a photo of the delivery note or the goods, or skip and enter the items by hand. | Fotora urupapuro rw'ibyakiriwe cyangwa ibicuruzwa, cyangwa ubyirengagize wandike ibintu ubwawe. | ⚠ needs review |
| `receiving.skipPhoto` | Skip photo | Simbuka ifoto | ⚠ needs review |
| `receiving.startedAt` | Started at {{time}} | Byatangiye saa {{time}} | ⚠ needs review |
| `receiving.takePhotoLabel` | Take photo | Fata ifoto | ⚠ needs review |
| `receiving.photoHint` | Photograph the delivery note or the goods. | Fotora urupapuro rw'ibyakiriwe cyangwa ibicuruzwa. | ⚠ needs review |
| `receiving.skipPhotoLogItems` | Skip photo — log items | Simbuka ifoto — andika ibintu | ⚠ needs review |
| `receiving.logDeliveryTitle` | Log delivery | Andika ibyakiriwe | ⚠ needs review |
| `receiving.addItemToLog` | Add at least one item to log the delivery. | Ongeraho nibura ikintu kimwe kugira ngo wandike ibyakiriwe. | ⚠ needs review |
| `receiving.fixItems_one` | Fix {{count}} item before logging. | Kosora ikintu {{count}} mbere yo kwandika. | ⚠ needs review |
| `receiving.fixItems_other` | Fix {{count}} items before logging. | Kosora ibintu {{count}} mbere yo kwandika. | ⚠ needs review |
| `receiving.deliveryStartedAt` | Delivery started at {{time}} | Kwakira byatangiye saa {{time}} | ⚠ needs review |
| `receiving.deliveryPhoto` | Delivery photo | Ifoto y'ibyakiriwe | ⚠ needs review |
| `receiving.deliveryDefaultName` | Delivery | Ibyakiriwe | ⚠ needs review |
| `receiving.searchCatalog` | Search the catalog… | Shakisha ku rutonde rw'ibicuruzwa… | ⚠ needs review |
| `receiving.addCustomNamed` | + Add “{{query}}” as a custom item | + Ongeraho “{{query}}” nk'ikintu cyawe bwite | ⚠ needs review |
| `receiving.itemNamePlaceholder` | Item name | Izina ry'ikintu | ⚠ needs review |
| `receiving.itemNameLabel` | Item name | Izina ry'ikintu | ⚠ needs review |
| `receiving.removeItemLabel` | Remove {{name}} | Kuraho {{name}} | ⚠ needs review |
| `receiving.map.start` | Start | Intangiriro | ⚠ needs review |
| `receiving.map.tapToRemove` | Tap to remove | Kanda ukureho | ⚠ needs review |
| `receiving.map.shareMessage` | {{supplier}} delivery location: {{url}} | Aho {{supplier}} azagezamo ibicuruzwa: {{url}} | ⚠ needs review |
| `receiving.capturedPhoto` | Captured delivery photo | Ifoto y'ibyakiriwe yafashwe | ⚠ needs review |
| `receiving.annotationNote` | Note on the photo | Icyitonderwa ku ifoto | ⚠ needs review |
| `receiving.acceptedQuantity` | Accepted quantity | Ingano yakiriwe | ⚠ needs review |
| `receiving.discrepancyReason` | Reason for the difference | Impamvu y'itandukaniro | ⚠ needs review |
| `receiving.acceptLabel` | Accept delivery | Akira ibyagejejwe | ⚠ needs review |
| `receiving.partialLabel` | Partially accept delivery | Akira igice cy'ibyagejejwe | ⚠ needs review |
| `receiving.rejectLabel` | Reject delivery | Anga ibyagejejwe | ⚠ needs review |
| `receiving.aiQuantityEstimate` | About {{qty}} {{unit}} (AI estimate — enter the actual quantity below) | Hafi {{qty}} {{unit}} (igereranya rya AI — andika ingano nyayo hepfo) | ⚠ needs review |
| `receiving.refPriceLine` | Reference price: {{price}}/{{unit}} | Igiciro fatizo: {{price}}/{{unit}} | ⚠ needs review |
| `receiving.openDeliveryLabel` | Open delivery for order {{id}} | Fungura ibyagejejwe by'itumiza {{id}} | ⚠ needs review |

## errors (3)

| Key | English source | Kinyarwanda draft | Status |
|---|---|---|---|
| `errors.boundary.title` | Something went wrong | Hari ikitagenze neza | ⚠ needs review |
| `errors.boundary.body` | The app hit an unexpected problem. Your saved data is safe. | Porogaramu yahuye n'ikibazo kitunguranye. Amakuru yawe yabitswe ari amahoro. | ⚠ needs review |
| `errors.boundary.retry` | Try again | Ongera ugerageze | ⚠ needs review |

## kitchens (92)

| Key | English source | Kinyarwanda draft | Status |
|---|---|---|---|
| `kitchens.title` | Kitchens | Ibikoni | ⚠ needs review |
| `kitchens.yourKitchens` | Your Kitchens | Ibikoni Byawe | ⚠ needs review |
| `kitchens.selectKitchen` | Select kitchen | Hitamo igataraga | ⚠ needs review |
| `kitchens.noKitchens` | No kitchens yet. Add your first kitchen. | Nta magataraga. Ongeraho igataraga yawe rya mbere. | ⚠ needs review |
| `kitchens.noKitchensTitle` | No kitchens yet | Nta gikoni kirahari | ⚠ needs review |
| `kitchens.noKitchensDesc` | Create your first kitchen to start managing stock, menus, and deliveries. | Kora igikoni cyawe cya mbere kugira ngo ucunge ububiko, menu n'ibyakiriwe. | ⚠ needs review |
| `kitchens.createKitchen` | Create Kitchen | Kora igikoni | ⚠ needs review |
| `kitchens.addLocation` | Add location | Ongeraho aho giherereye | ⚠ needs review |
| `kitchens.address` | Address | Aderesi | ⚠ needs review |
| `kitchens.cuisine` | Cuisine | Ubwoko bw'Ituze | ⚠ needs review |
| `kitchens.seating` | Seating | Ibibanza | ⚠ needs review |
| `kitchens.status` | Status | Imimerere | ⚠ needs review |
| `kitchens.active` | Active | Ikiri gukoreshwa | ⚠ needs review |
| `kitchens.archived` | Archived | Ryashyiriwe mu bubiko | ⚠ needs review |
| `kitchens.createYourKitchen` | Create Your Kitchen | Kora igikoni cyawe | ⚠ needs review |
| `kitchens.createHeroSub` | Your kitchen workspace for managing stock, menus, and deliveries. | Aho ukorera ucunga ububiko, menu n'ibyakiriwe. | ⚠ needs review |
| `kitchens.kitchenNameLabel` | Kitchen Name * | Izina ry'igikoni * | ⚠ needs review |
| `kitchens.kitchenNamePlaceholder` | e.g. Kigali Bistro | urugero: Kigali Bistro | ⚠ needs review |
| `kitchens.cityLabel` | City / Location * | Umujyi / Aho giherereye * | ⚠ needs review |
| `kitchens.cityPlaceholder` | e.g. Kigali, Musanze, Butare | urugero: Kigali, Musanze, Butare | ⚠ needs review |
| `kitchens.addressLabel` | Address (optional) | Aderesi (si ngombwa) | ⚠ needs review |
| `kitchens.addressPlaceholder` | e.g. KG 7 Ave, Kigali | urugero: KG 7 Ave, Kigali | ⚠ needs review |
| `kitchens.seatingLabel` | Seating Capacity (optional) | Imyanya yo kwicaramo (si ngombwa) | ⚠ needs review |
| `kitchens.seatingPlaceholder` | e.g. 40 | urugero: 40 | ⚠ needs review |
| `kitchens.createError` | Failed to create kitchen. Please try again. | Gukora igikoni byanze. Ongera ugerageze. | ⚠ needs review |
| `kitchens.createButton` | Create Kitchen | Kora igikoni | ⚠ needs review |
| `kitchens.archiveKitchen` | Archive Kitchen | Shyingura igikoni | ⚠ needs review |
| `kitchens.isArchived` | This kitchen is archived. | Iki gikoni cyashyinguwe. | ⚠ needs review |
| `kitchens.saveError` | Failed to save changes. Please try again. | Kubika impinduka byanze. Ongera ugerageze. | ⚠ needs review |
| `kitchens.saving` | Saving… | Birimo kubikwa… | ⚠ needs review |
| `kitchens.saveButton` | Save Changes | Bika impinduka | ⚠ needs review |
| `kitchens.archiveDialogTitle` | Archive Kitchen? | Gushyingura igikoni? | ⚠ needs review |
| `kitchens.archiveDialogMessage` | This kitchen will be hidden from your workspace. You can restore it later. | Iki gikoni kizahishwa aho ukorera. Ushobora kukigarura nyuma. | ⚠ needs review |
| `kitchens.archiveConfirm` | Archive | Shyingura | ⚠ needs review |
| `kitchens.photoPermissionTitle` | Photo access needed | Uruhushya rw'amafoto rurakenewe | ⚠ needs review |
| `kitchens.photoPermissionBody` | Allow access to your camera or photos to add a kitchen photo. | Emera kamera cyangwa amafoto kugira ngo wongereho ifoto y'igikoni. | ⚠ needs review |
| `kitchens.photoTitle` | Kitchen photo | Ifoto y'igikoni | ⚠ needs review |
| `kitchens.photoSource` | Take a photo or choose one from your gallery. | Fata ifoto cyangwa uhitemo imwe mu mafoto yawe. | ⚠ needs review |
| `kitchens.addPhotoLabel` | Add a kitchen photo | Ongeraho ifoto y'igikoni | ⚠ needs review |
| `kitchens.notFound` | Kitchen not found. | Igikoni ntikibonetse. | ⚠ needs review |
| `kitchens.noChanges` | No changes to save. | Nta mpinduka zo kubika. | ⚠ needs review |
| `kitchens.detailsEyebrow` | Kitchen details | Ibisobanuro by'igikoni | ⚠ needs review |
| `kitchens.changePhotoLabel` | Change kitchen photo | Hindura ifoto y'igikoni | ⚠ needs review |
| `kitchens.archiveError` | Couldn't archive the kitchen. Try again. | Gushyingura igikoni byanze. Ongera ugerageze. | ⚠ needs review |
| `kitchens.selectorLabel` | Choose the active kitchen | Hitamo igikoni ukoresha | ⚠ needs review |
| `kitchens.addKitchenLabel` | Add a kitchen | Ongeraho igikoni | ⚠ needs review |
| `kitchens.addLocationFor` | Add a location for {{name}} | Ongeraho aho {{name}} giherereye | ⚠ needs review |
| `kitchens.editKitchenLabel` | Edit {{name}} | Hindura {{name}} | ⚠ needs review |
| `kitchens.editArchivedLabel` | Edit archived kitchen {{name}} | Hindura igikoni cyashyinguwe {{name}} | ⚠ needs review |
| `kitchens.regionHeading` | Region & money | Akarere n'amafaranga | ⚠ needs review |
| `kitchens.countryLabel` | Country | Igihugu | ⚠ needs review |
| `kitchens.currencyLabel` | Currency | Ifaranga | ⚠ needs review |
| `kitchens.timezoneLabel` | Time zone | Isaha y'akarere | ⚠ needs review |
| `kitchens.choose` | Choose… | Hitamo… | ⚠ needs review |
| `kitchens.currencyLockedHint` | Prices depend on the currency. Use "Change currency" below to convert or relabel them. | Ibiciro bishingiye ku ifaranga. Koresha "Guhindura ifaranga" hasi kugira ngo ubihindure. | ⚠ needs review |
| `kitchens.errors.country` | Choose the kitchen's country. | Hitamo igihugu igikoni kirimo. | ⚠ needs review |
| `kitchens.errors.currency` | Choose the currency your prices are in. | Hitamo ifaranga ibiciro byawe biriho. | ⚠ needs review |
| `kitchens.errors.timezone` | Choose the kitchen's time zone. | Hitamo isaha y'akarere k'igikoni. | ⚠ needs review |
| `currencyChange.title` | Change currency | Guhindura ifaranga | ⚠ needs review |
| `currencyChange.entryTitle` | Change currency | Guhindura ifaranga | ⚠ needs review |
| `currencyChange.entrySubtitle` | Now {{currency}} · convert or relabel your prices | Ubu ni {{currency}} · hindura ibiciro cyangwa izina ry'ifaranga | ⚠ needs review |
| `currencyChange.entryHint` | Opens a preview before anything changes | Ubanza kubona uko bizaba mbere y'uko hagira igihinduka | ⚠ needs review |
| `currencyChange.currentLabel` | Current currency | Ifaranga rikoreshwa ubu | ⚠ needs review |
| `currencyChange.newLabel` | New currency | Ifaranga rishya | ⚠ needs review |
| `currencyChange.newHint` | Choose the currency your kitchen will use | Hitamo ifaranga igikoni cyawe kizakoresha | ⚠ needs review |
| `currencyChange.modeHeading` | How should prices change? | Ibiciro bihinduke bite? | ⚠ needs review |
| `currencyChange.mode.convert` | Convert my prices | Hindura ibiciro byanjye | ⚠ needs review |
| `currencyChange.mode.relabel` | Relabel only | Hindura izina gusa | ⚠ needs review |
| `currencyChange.modeHelp.convert` | Every menu price and ingredient cost is converted at one exchange rate, shown below with its date. | Buri giciro cyo kuri menu n'ikiguzi cy'ibikoresho bihindurwa ku gipimo kimwe cy'ivunjisha, kigaragara hasi n'itariki yacyo. | ⚠ needs review |
| `currencyChange.modeHelp.relabel` | Use this if your prices were entered in the wrong currency. The amounts stay the same; only the currency changes. | Koresha ibi niba ibiciro byawe byanditswe mu ifaranga ritari ryo. Imibare ntihinduka; ifaranga ni ryo rihinduka gusa. | ⚠ needs review |
| `currencyChange.loading` | Loading the preview | Birimo gutegurwa | ⚠ needs review |
| `currencyChange.previewError` | Couldn't load the preview. Check your connection and try again. | Ntibyashobotse kwerekana uko bizaba. Reba interineti wongere ugerageze. | ⚠ needs review |
| `currencyChange.rateOf` | Rate of {{date}} | Igipimo cyo ku wa {{date}} | ⚠ needs review |
| `currencyChange.crossRate` | calculated via USD | cyabazwe hifashishijwe USD | ⚠ needs review |
| `currencyChange.rateUnavailable` | Rate unavailable: there is no exchange rate from the last 3 days. Try again later, or relabel instead. | Nta gipimo cy'ivunjisha gihari cyo mu minsi 3 ishize. Ongera ugerageze nyuma, cyangwa uhindure izina gusa. | ⚠ needs review |
| `currencyChange.relabelPrecision` | Some prices have more decimals than {{currency}} allows. Fix them first, or convert instead. | Hari ibiciro bifite ibice birenze ibyo {{currency}} yemera. Banza ubikosore, cyangwa uhindure ibiciro. | ⚠ needs review |
| `currencyChange.historyTitle` | This kitchen already has records | Iki gikoni gisanzwe gifite amakuru | ⚠ needs review |
| `currencyChange.historyBody` | {{sales}} sales, {{orders}} orders, {{stock}} stock entries and {{deliveries}} deliveries keep their original currency. Reports that mix old and new records will show both currencies. | Ibyagurishijwe {{sales}}, komande {{orders}}, ibyanditswe muri stock {{stock}} n'ibyakiriwe {{deliveries}} bigumana ifaranga ryabyo rya mbere. Raporo ivanga amakuru ya kera n'amashya izerekana amafaranga yombi. | ⚠ needs review |
| `currencyChange.pricesHeading` | Prices that change ({{count}}) | Ibiciro bihinduka ({{count}}) | ⚠ needs review |
| `currencyChange.noPrices` | No prices to change yet. | Nta biciro byo guhindura birahari. | ⚠ needs review |
| `currencyChange.unitCost` | cost per unit | ikiguzi kuri buri gipimo | ⚠ needs review |
| `currencyChange.beforeAfter` | {{before}} → {{after}} | {{before}} → {{after}} | ⚠ needs review |
| `currencyChange.needsRounding` | needs rounding | bisaba kuzengurutsa | ⚠ needs review |
| `currencyChange.noRate` | no rate | nta gipimo | ⚠ needs review |
| `currencyChange.priceStepReset` | Your price rounding step goes back to the default for the new currency. | Uburyo bwo kuzengurutsa ibiciro busubira ku bwa ifaranga rishya. | ⚠ needs review |
| `currencyChange.pastRecords` | Past sales, orders, deliveries and stock records are not changed. | Ibyagurishijwe, komande, ibyakiriwe n'ibya stock byashize ntibihinduka. | ⚠ needs review |
| `currencyChange.typeToConfirm` | Type {{code}} to confirm | Andika {{code}} kugira ngo wemeze | ⚠ needs review |
| `currencyChange.applyConvert` | Convert prices | Hindura ibiciro | ⚠ needs review |
| `currencyChange.applyRelabel` | Relabel currency | Hindura ifaranga | ⚠ needs review |
| `currencyChange.rateChanged` | The exchange rate changed. Check the new preview and confirm again. | Igipimo cy'ivunjisha cyahindutse. Reba uko bizaba ubu wongere wemeze. | ⚠ needs review |
| `currencyChange.applyError` | Couldn't change the currency. Nothing was changed. | Ntibyashobotse guhindura ifaranga. Nta cyahindutse. | ⚠ needs review |
| `currencyChange.convertOff` | Converting prices is not available for kitchens in your country yet. You can still relabel, or keep prices in your own currency. | Guhindura ibiciro mu yandi mafaranga ntibirashoboka ku bikoni byo mu gihugu cyawe. Ushobora guhindura izina ry'ifaranga gusa, cyangwa ugakomeza ibiciro mu ifaranga ryawe. | ⚠ needs review |

## menu (208)

| Key | English source | Kinyarwanda draft | Status |
|---|---|---|---|
| `menu.title` | Menu | Menu | ⚠ needs review |
| `menu.emptyTitle` | Your menu is empty | Menu yawe nta biribwa | ⚠ needs review |
| `menu.addFirstItem` | Add First Item | Ongeraho ikiribwa cya mbere | ⚠ needs review |
| `menu.whyAddItems` | Why add menu items? | Kuki wongeraho ibiribwa? | ⚠ needs review |
| `menu.edit` | Edit | Hindura | ⚠ needs review |
| `menu.recipe` | Recipe | Ibyo guteka | ⚠ needs review |
| `menu.deleteItem` | Delete Item | Siba ikiribwa | ⚠ needs review |
| `menu.scanMenu` | Scan Menu | Skana menu | ⚠ needs review |
| `menu.scanMenuPrompt` | Photograph your menu and AI will extract the items | Fata ifoto ya menu kandi AI izakuramo ibiribwa | ⚠ needs review |
| `menu.howToScan` | How to scan | Uburyo bwo guskana | ⚠ needs review |
| `menu.readingMenu` | Reading menu… | Gusoma menu… | ⚠ needs review |
| `menu.scanError` | Could not read this photo | Kutagira uburyo bwo gusoma iyi foto | ⚠ needs review |
| `menu.retakePhoto` | Retake photo | Fata ifoto ubundi | ⚠ needs review |
| `menu.addManually` | Add manually | Ongeraho | ⚠ needs review |
| `menu.noItemsDetected` | No items detected | Nta biribwa byaboneka | ⚠ needs review |
| `menu.noPrice` | No price | Nta giciro | ⚠ needs review |
| `menu.importDone` | Done | Byarangiye | ⚠ needs review |
| `menu.cancelImport` | Cancel | Hagarika | ⚠ needs review |
| `menu.noKitchenSelected` | No kitchen selected | Nta gutaraga ryatoranijwe | ⚠ needs review |
| `menu.selectKitchenFirst` | Select a kitchen from the Profile tab to manage your menu. | Hitamo igataraga mu gice cya Umwirondoro kugira ngo ucunge menu yawe. | ⚠ needs review |
| `menu.categories.all` | All | Byose | ⚠ needs review |
| `menu.categories.main` | Main | Ifunguro nyamukuru | ⚠ needs review |
| `menu.categories.side` | Side | Imboga n'ibiherekeza | ⚠ needs review |
| `menu.categories.drink` | Drink | Icyokunywa | ⚠ needs review |
| `menu.categories.dessert` | Dessert | Ibiryo byo kurangiza | ⚠ needs review |
| `menu.recordSales` | Record sales | Andika ibyagurishijwe | ⚠ needs review |
| `menu.addItem` | Add menu item | Ongeraho ifunguro | ⚠ needs review |
| `menu.searchPlaceholder` | Search menu… | Shakisha kuri menu… | ⚠ needs review |
| `menu.loadError` | Couldn't load the menu. | Menu ntiyafunguwe. | ⚠ needs review |
| `menu.noResults` | No matching dishes | Nta funguro rihuye | ⚠ needs review |
| `menu.noResultsBody` | Try another name or category. | Gerageza irindi zina cyangwa ikindi cyiciro. | ⚠ needs review |
| `menu.emptyBody` | Add your dishes and drinks so you can record sales and see which ingredients you need. | Ongeraho amafunguro n'ibinyobwa kugira ngo wandike ibyagurishijwe kandi umenye ibikoresho ukeneye. | ⚠ needs review |
| `menu.off` | Off | Ntirikora | ⚠ needs review |
| `menu.openItem` | Open {{name}} | Fungura {{name}} | ⚠ needs review |
| `menu.recipeOf` | Recipe for {{name}} | Inteko ya {{name}} | ⚠ needs review |
| `menu.moreOptions` | More options for {{name}} | Ibindi bya {{name}} | ⚠ needs review |
| `menu.deleteItemLabel` | Delete {{name}} | Siba {{name}} | ⚠ needs review |
| `menu.removed` | {{name}} removed | {{name}} yakuweho | ⚠ needs review |
| `menu.scan.howTitle` | How to scan | Uko bafotora menu | ⚠ needs review |
| `menu.scan.howBody` | Point the camera at a printed or handwritten menu, flat and well lit. | Erekeza kamera kuri menu icapye cyangwa yanditse n'intoki, iri hasi kandi ibonesheje neza. | ⚠ needs review |
| `menu.scan.multiPage` | Long menu? Scan one page at a time — you can add pages before importing. | Menu ndende? Fotora ipaji imwe imwe — ushobora kongeraho amapaji mbere yo kwinjiza. | ⚠ needs review |
| `menu.scan.takePhoto` | Take a photo | Fata ifoto | ⚠ needs review |
| `menu.scan.fromGallery` | Choose from gallery | Hitamo mu mafoto | ⚠ needs review |
| `menu.scan.cameraDenied` | Camera access is off. Allow it in Settings, or choose a photo from your gallery. | Kamera ntiyemerewe. Yemerere mu Igenamiterere cyangwa uhitemo ifoto mu mafoto yawe. | ⚠ needs review |
| `menu.scan.addPage` | Add another page | Ongeraho indi paji | ⚠ needs review |
| `menu.scan.addPageSub` | Scan the next page of the same menu | Fotora ipaji ikurikira ya menu imwe | ⚠ needs review |
| `menu.scan.tryAnother` | Try another photo | Gerageza indi foto | ⚠ needs review |
| `menu.scan.found_one` | {{count}} item found | Ikintu {{count}} cyabonetse | ⚠ needs review |
| `menu.scan.found_other` | {{count}} items found | Ibintu {{count}} byabonetse | ⚠ needs review |
| `menu.scan.selected_one` | {{count}} selected | {{count}} cyatoranyijwe | ⚠ needs review |
| `menu.scan.selected_other` | {{count}} selected | {{count}} byatoranyijwe | ⚠ needs review |
| `menu.scan.reviewHint` | AI estimate — check names and prices. Nothing is saved until you import. | Igereranya rya AI — genzura amazina n'ibiciro. Nta kibikwa utarinjiza. | ⚠ needs review |
| `menu.scan.noNewItems` | No new items on that page. | Nta kintu gishya kuri iyo paji. | ⚠ needs review |
| `menu.scan.importN_one` | Import {{count}} item | Injiza ikintu {{count}} | ⚠ needs review |
| `menu.scan.importN_other` | Import {{count}} items | Injiza ibintu {{count}} | ⚠ needs review |
| `menu.scan.importing` | Importing… | Birimo kwinjizwa… | ⚠ needs review |
| `menu.scan.importError` | Some items couldn't be saved. Try again — nothing will be added twice. | Bimwe ntibyabitswe. Ongera ugerageze — nta kizongerwamo kabiri. | ⚠ needs review |
| `menu.scan.fixRows_one` | Fix {{count}} item before importing. | Kosora ikintu {{count}} mbere yo kwinjiza. | ⚠ needs review |
| `menu.scan.fixRows_other` | Fix {{count}} items before importing. | Kosora ibintu {{count}} mbere yo kwinjiza. | ⚠ needs review |
| `menu.scan.nameRequired` | Enter a name (at least 2 letters). | Andika izina (nibura inyuguti 2). | ⚠ needs review |
| `menu.scan.priceRequired` | Enter a price. | Andika igiciro. | ⚠ needs review |
| `menu.scan.nameLabel` | Item name | Izina ry'ikintu | ⚠ needs review |
| `menu.scan.priceLabel` | Price of {{name}} in {{currency}} | Igiciro cya {{name}} mu {{currency}} | ⚠ needs review |
| `menu.scan.importItem` | Import {{name}} | Injiza {{name}} | ⚠ needs review |
| `menu.scan.updatePriceOf` | Update the price of {{name}} | Hindura igiciro cya {{name}} | ⚠ needs review |
| `menu.scan.unnamed` | item | ikintu | ⚠ needs review |
| `menu.scan.readAs` | Read as: “{{text}}” | Byasomwe gutya: “{{text}}” | ⚠ needs review |
| `menu.scan.imported_one` | {{count}} item imported | Ikintu {{count}} cyinjijwe | ⚠ needs review |
| `menu.scan.imported_other` | {{count}} items imported | Ibintu {{count}} byinjijwe | ⚠ needs review |
| `menu.scan.undone` | Import undone | Kwinjiza byasubijwe inyuma | ⚠ needs review |
| `menu.scan.undoFailed` | Couldn't undo — remove the items by hand. | Gusubiza inyuma byanze — kuraho ibyo bintu ubwawe. | ⚠ needs review |
| `menu.scan.discardTitle` | Discard scanned items? | Ureka ibyafotowe? | ⚠ needs review |
| `menu.scan.discardBody` | The items you reviewed will not be imported. | Ibyo wagenzuye ntibizinjizwa. | ⚠ needs review |
| `menu.scan.keepReviewing` | Keep reviewing | Komeza ugenzure | ⚠ needs review |
| `menu.scan.discard` | Discard | Reka | ⚠ needs review |
| `menu.scan.flags.checkName` | Check the name — it was hard to read. | Genzura izina — ntiryasomekaga neza. | ⚠ needs review |
| `menu.scan.flags.checkPrice` | Check the price — it was hard to read. | Genzura igiciro — ntigisomekaga neza. | ⚠ needs review |
| `menu.scan.flags.noPrice` | No price found — add one. | Nta giciro cyabonetse — ongeraho. | ⚠ needs review |
| `menu.scan.flags.priceHigh` | Much higher than your other prices — is it right? | Kiri hejuru cyane y'ibindi biciro byawe — ni cyo koko? | ⚠ needs review |
| `menu.scan.flags.priceLow` | Much lower than your other prices — is it right? | Kiri hasi cyane y'ibindi biciro byawe — ni cyo koko? | ⚠ needs review |
| `menu.scan.flags.duplicateNewPrice` | Already on the menu at {{price}} — select it to update the price. | Risanzwe kuri menu ku giciro cya {{price}} — rihitemo kugira ngo uhindure igiciro. | ⚠ needs review |
| `menu.scan.flags.duplicateSamePrice` | Already on the menu at the same price. | Risanzwe kuri menu ku giciro kimwe. | ⚠ needs review |
| `menu.scan.route.dishTitle` | This looks like a single dish, not a menu. | Iyi isa n'ifunguro rimwe, si menu. | ⚠ needs review |
| `menu.scan.route.dishBody` | Add it as one item with AI suggestions for ingredients and price? | Urishyiraho nk'ikintu kimwe, AI igusabira ibikoresho n'igiciro? | ⚠ needs review |
| `menu.scan.route.dishAction` | Add as one dish | Ongeraho nk'ifunguro rimwe | ⚠ needs review |
| `menu.scan.route.receiptTitle` | This looks like a receipt. | Iyi isa n'inyemezabuguzi. | ⚠ needs review |
| `menu.scan.route.deliveryTitle` | This looks like a delivery note. | Iyi isa n'urupapuro rw'ibyakiriwe. | ⚠ needs review |
| `menu.scan.route.deliveryBody` | Open Log Delivery with this photo instead? | Ahubwo ufungura kwandika ibyakiriwe ukoresheje iyi foto? | ⚠ needs review |
| `menu.scan.route.deliveryAction` | Open Log Delivery | Fungura kwandika ibyakiriwe | ⚠ needs review |
| `menu.scan.route.otherTitle` | This doesn't look like a menu. | Iyi ntisa na menu. | ⚠ needs review |
| `menuItem.notFound` | Item not found. | Ikiribwa ntigibonetse. | ⚠ needs review |
| `menuItem.foodCost` | Food cost | Ikiguzi cy'ibiribwa | ⚠ needs review |
| `menuItem.margin` | Margin | Inyungu | ⚠ needs review |
| `menuItem.addIngredient` | Add Ingredient | Ongeraho ikiribwa | ⚠ needs review |
| `menuItem.addFirstIngredient` | Add First Ingredient | Ongeraho ikiribwa cya mbere | ⚠ needs review |
| `menuItem.tryAgain` | Try again | Ongera ugerageze | ⚠ needs review |
| `menuItem.outOfStock` | Out | Nta bubiko | ⚠ needs review |
| `menuItem.editItem` | Edit | Hindura | ⚠ needs review |
| `menuItem.recipeIngredients` | Recipe Ingredients | Ibikoresho byo guteka | ⚠ needs review |
| `menuItem.recordSale` | Record a Sale | Andika ubuguzi | ⚠ needs review |
| `menuItem.recordSaleSub` | Log portions sold today | Andika amashami aguzwe uyu munsi | ⚠ needs review |
| `menuItem.availableOnMenu` | Available on menu | Iboneka kuri menu | ⚠ needs review |
| `menuItem.visibleToStaff` | Visible to staff and in sales | Ibonekera abakozi no mu buguzi | ⚠ needs review |
| `menuItem.hiddenFromSales` | Hidden from sales entry | Yashyizwe hanze mu kwandika ubuguzi | ⚠ needs review |
| `menuItem.noIngredientsYet` | No ingredients linked yet.<br>Add ingredients to track food cost and stock usage. | Nta bikoresho bihuye kugeza ubu.<br>Ongeraho ibikoresho kugira ngo ukurikire ikiguzi cy'ibiribwa n'imikoreshereze y'ububiko. | ⚠ needs review |
| `menuItem.foodCostHigh` | Food cost is high — {{margin}}% margin | Ikiguzi cy'ibiribwa ni kinini — inyungu {{margin}}% | ⚠ needs review |
| `menuItem.highestCostIngredient` | Highest cost ingredient: {{name}} · {{cost}}/portion | Ikiribwa cy'ikiguzi kinini: {{name}} · {{cost}}/igice | ⚠ needs review |
| `menuItem.title` | Menu item | Ifunguro | ⚠ needs review |
| `menuItem.active` | Active | Rirakoreshwa | ⚠ needs review |
| `menuItem.inactive` | Inactive | Ntirikoreshwa | ⚠ needs review |
| `menuItem.editItemLabel` | Edit {{name}} | Hindura {{name}} | ⚠ needs review |
| `menuItem.availableLabel` | {{name}} available on menu | {{name}} iri kuri menu | ⚠ needs review |
| `menuItem.raisePriceTo` | To reach a {{margin}}% gross margin, raise the price to {{price}}. | Kugira ngo ugere ku nyungu ya {{margin}}%, zamura igiciro kigere kuri {{price}}. | ⚠ needs review |
| `menuItem.raisePrice` | Consider raising the selling price to improve your margin. | Tekereza kuzamura igiciro cyo kugurisha kugira ngo inyungu yiyongere. | ⚠ needs review |
| `menuItem.orReducePortion` | Or reduce the {{name}} portion. | Cyangwa ugabanye ingano ya {{name}}. | ⚠ needs review |
| `menuItem.addIngredientLabel` | Add ingredient to recipe | Ongeraho ibyo guteka | ⚠ needs review |
| `menuItem.unknownIngredient` | Unknown ingredient | Ikiribwa kitazwi | ⚠ needs review |
| `menuItem.perPortion` | {{qty}} {{unit}} per portion | {{qty}} {{unit}} ku isahani | ⚠ needs review |
| `menuItem.removeLineLabel` | Remove {{name}} from recipe | Kuraho {{name}} mu byo guteka | ⚠ needs review |
| `menuItem.removeLineTitle` | Remove ingredient? | Gukuraho ikiribwa? | ⚠ needs review |
| `menuItem.removeLineMessage` | {{name}} will be removed from this recipe. | {{name}} izakurwa muri byo guteka. | ⚠ needs review |
| `menuItem.removeLineConfirm` | Remove | Kuraho | ⚠ needs review |
| `menuItem.lineRemoved` | {{name}} removed | {{name}} yakuweho | ⚠ needs review |
| `menuItem.removeLineError` | Could not remove the ingredient. Try again. | Ntibyashobotse gukuraho ikiribwa. Ongera ugerageze. | ⚠ needs review |
| `menuItem.lineAdded` | {{name}} added to recipe | {{name}} yongewe mu byo guteka | ⚠ needs review |
| `menuItem.qtyInvalid` | Enter a quantity greater than 0. | Andika ingano iruta 0. | ⚠ needs review |
| `menuItem.addLineError` | Could not add the ingredient. Check your connection and try again. | Ntibyashobotse kongeraho ikiribwa. Genzura murandasi wongere ugerageze. | ⚠ needs review |
| `menuItem.changeIngredient` | Choose a different ingredient | Hitamo ikindi kiribwa | ⚠ needs review |
| `menuItem.addIngredientSubtitle` | {{name}} · {{unit}} | {{name}} · {{unit}} | ⚠ needs review |
| `menuItem.addToRecipe` | Add to recipe | Ongera mu byo guteka | ⚠ needs review |
| `menuItem.qtyPerPortion` | Quantity per portion | Ingano ku isahani | ⚠ needs review |
| `menuItem.usagePreview_one` | {{count}} portion uses {{qty}} {{unit}}. | Isahani {{count}} ikoresha {{qty}} {{unit}}. | ⚠ needs review |
| `menuItem.usagePreview_other` | {{count}} portions use {{qty}} {{unit}}. | Amasahani {{count}} akoresha {{qty}} {{unit}}. | ⚠ needs review |
| `menuItem.inStockQty` | {{qty}} {{unit}} in stock | {{qty}} {{unit}} biri mu bubiko | ⚠ needs review |
| `menuItem.noStockRecorded` | No stock recorded yet | Nta bubiko bwanditswe | ⚠ needs review |
| `menuItem.searchIngredients` | Search ingredients… | Shakisha ibikoresho… | ⚠ needs review |
| `menuItem.loadIngredientsError` | Could not load ingredients. | Ntibyashobotse kubona ibikoresho. | ⚠ needs review |
| `menuItem.pickIngredient` | Choose {{name}} | Hitamo {{name}} | ⚠ needs review |
| `menuItem.noIngredientsInStock` | No ingredients in stock yet. | Nta bikoresho biri mu bubiko. | ⚠ needs review |
| `menuItem.noIngredientMatch` | No ingredient matches “{{query}}”. | Nta kiribwa gihuye na “{{query}}”. | ⚠ needs review |
| `menuItem.allIngredientsInRecipe` | All ingredients are already in this recipe. | Ibikoresho byose bisanzwe biri mu byo guteka. | ⚠ needs review |
| `menuItem.createNamed` | Add “{{name}}” as a new ingredient | Ongeraho “{{name}}” nk'ikiribwa gishya | ⚠ needs review |
| `menuItem.createNew` | Add a new ingredient | Ongeraho ikiribwa gishya | ⚠ needs review |
| `menuItem.lineConverted` | {{original}} at {{rate}} ({{date}}) | {{original}} ku gipimo {{rate}} ({{date}}) | ⚠ needs review |
| `menuItem.lineRateUnavailable` | Cost in {{currency}}: rate unavailable | Ikiguzi muri {{currency}}: nta gipimo gihari | ⚠ needs review |
| `menuItem.costIncomplete` | Food cost is incomplete: some costs in another currency have no recent exchange rate. | Ikiguzi cy'ibiryo ntikizuye: hari ibiguzi biri mu yandi mafaranga bidafite igipimo cy'ivunjisha cya vuba. | ⚠ needs review |
| `menuItem.lineConversionOff` | Cost in {{currency}}: currency conversion is not available for this kitchen yet. | Igiciro mu {{currency}}: guhindura amafaranga ntibirashoboka kuri iki gikoni. | ⚠ needs review |
| `createItem.analysingDish` | Analyzing dish… | Gusuzuma ifunguro… | ⚠ needs review |
| `createItem.addDishPhoto` | Add Dish Photo | Ongeraho ifoto y'ifunguro | ⚠ needs review |
| `createItem.aiLabel` | AI | AI | ⚠ needs review |
| `createItem.aiSuggestions` | AI Suggestions | Inama za AI | ⚠ needs review |
| `createItem.suggestedPrice` | Suggested price: | Igiciro gitangwa: | ⚠ needs review |
| `createItem.title` | New Menu Item | Ikiribwa gishya cya menu | ⚠ needs review |
| `createItem.helpText` | Add a dish or drink to your menu. Activate or deactivate items from the Menu tab. | Ongeraho ifunguro cg ikinywajwi kuri menu yawe. | ⚠ needs review |
| `createItem.aiWillSuggest` | AI will suggest ingredients and a price | AI izatangira ibikoresho n'igiciro | ⚠ needs review |
| `createItem.analyzeWithAI` | Analyze with AI | Suzuma na AI | ⚠ needs review |
| `createItem.analyzingDish` | Analyzing dish… | Gusuzuma ifunguro… | ⚠ needs review |
| `createItem.tapToUse` | (tap to use) | (kanda kugira ngo ukoreshe) | ⚠ needs review |
| `createItem.detectedIngredients` | Detected Ingredients | Ibikoresho byaboneka | ⚠ needs review |
| `createItem.linkedAfterSaving` | These will be linked to the item after saving from the detail screen. | Bizahuza nyuma yo kubika ukoresheje ecran y'amakuru. | ⚠ needs review |
| `createItem.aiIngredientsNote` | After saving, open the item detail to link the AI-suggested ingredients to the recipe. | Nyuma yo kubika, fungura amakuru y'ikiribwa kugira ngo uhuze ibikoresho byatanzwe na AI. | ⚠ needs review |
| `createItem.itemNameLabel` | Item Name | Izina ry'ikiribwa | ⚠ needs review |
| `createItem.itemNamePlaceholder` | e.g. Brochettes, Ugali, Orange Juice | urugero. Brochettes, Ugali, Umutobe w'indimu | ⚠ needs review |
| `createItem.categoryLabel` | Category | Icyiciro | ⚠ needs review |
| `createItem.priceLabel` | Selling price ({{currency}}) | Igiciro cy'ubuguzi ({{currency}}) | ⚠ needs review |
| `createItem.pricePlaceholder` | e.g. 3500 | urugero. 3500 | ⚠ needs review |
| `createItem.descriptionLabel` | Description (optional) | Ibisobanuro (ntibisabwa) | ⚠ needs review |
| `createItem.descriptionPlaceholder` | e.g. Grilled beef skewers with peppers | urugero. Inyama z'inka zitondetse hamwe n'urusenda | ⚠ needs review |
| `createItem.priceAnomalyHigh` | This price is unusually high compared to your other items — please confirm it's correct. | Iki giciro ni kinini cyane ugereranyije n'ibindi biribwa byawe — nyamuneka emeza ko ari cyo. | ⚠ needs review |
| `createItem.priceAnomalyLow` | This price is unusually low compared to your other items — please confirm it's correct. | Iki giciro ni gito cyane ugereranyije n'ibindi biribwa byawe — nyamuneka emeza ko ari cyo. | ⚠ needs review |
| `createItem.saveButton` | Save Menu Item | Bika ikiribwa cya menu | ⚠ needs review |
| `createItem.nameError` | Name must be at least 2 characters. | Izina rigomba kugira nibura inyuguti 2. | ⚠ needs review |
| `createItem.priceRequired` | Enter a selling price. | Andika igiciro cyo kugurisha. | ⚠ needs review |
| `createItem.priceInvalid` | Enter a valid price. | Andika igiciro nyacyo. | ⚠ needs review |
| `createItem.permissionTitle` | Permission needed | Uruhushya rurakenewe | ⚠ needs review |
| `createItem.permissionBody` | Allow access to your camera or photos to add a dish photo. | Emera kamera cyangwa amafoto kugira ngo wongereho ifoto y'ifunguro. | ⚠ needs review |
| `createItem.addPhotoTitle` | Add dish photo | Ongeraho ifoto y'ifunguro | ⚠ needs review |
| `createItem.addPhotoBody` | Take a photo of the dish or choose one from your gallery. | Fata ifoto y'ifunguro cyangwa uhitemo imwe mu mafoto yawe. | ⚠ needs review |
| `createItem.createIngredientError` | Could not add {{name}} to stock. Try again. | Ntibyashobotse kongera {{name}} mu bubiko. Ongera ugerageze. | ⚠ needs review |
| `createItem.defaultMenuName` | Main Menu | Menu nyamukuru | ⚠ needs review |
| `createItem.saveError` | Could not save the item. Check your connection and try again. | Ntibyashobotse kubika ifunguro. Genzura murandasi wongere ugerageze. | ⚠ needs review |
| `createItem.formIncomplete` | Enter a name and a price to save. | Andika izina n'igiciro kugira ngo ubike. | ⚠ needs review |
| `createItem.removePhoto` | Remove photo | Kuraho ifoto | ⚠ needs review |
| `createItem.photoOnly` | Add a photo of the dish | Ongeraho ifoto y'ifunguro | ⚠ needs review |
| `createItem.priceRange` | Suggested price: {{low}} – {{high}} | Igiciro gisabwa: {{low}} – {{high}} | ⚠ needs review |
| `createItem.priceReasoning` | Based on ingredient cost of {{cost}} per portion at {{low}}–{{high}}% food cost ({{costed}} of {{total}} ingredients have a cost). | Bishingiye ku kiguzi cy'ibikoresho cya {{cost}} ku isahani, ku kiguzi cy'ibiribwa kiri hagati ya {{low}}% na {{high}}% (ibikoresho {{costed}} kuri {{total}} bifite ikiguzi). | ⚠ needs review |
| `createItem.usePrice` | Use {{price}} | Koresha {{price}} | ⚠ needs review |
| `createItem.priceUnavailable.no_matched_costs` | No price suggestion — add costs to the matching stock ingredients first. | Nta giciro gisabwa — banza wongere ibiguzi ku bikoresho bihuye biri mu bubiko. | ⚠ needs review |
| `createItem.priceUnavailable.no_ingredients` | No price suggestion — no ingredients were recognised. | Nta giciro gisabwa — nta bikoresho byamenyekanye. | ⚠ needs review |
| `createItem.acceptIngredient` | Use {{name}} | Koresha {{name}} | ⚠ needs review |
| `createItem.inStock` | In stock | Biri mu bubiko | ⚠ needs review |
| `createItem.newIngredient` | New | Gishya | ⚠ needs review |
| `createItem.removeIngredient` | Remove {{name}} | Kuraho {{name}} | ⚠ needs review |
| `createItem.qtyPerPortionLabel` | Quantity of {{name}} per portion | Ingano ya {{name}} ku isahani | ⚠ needs review |
| `createItem.unitPerPortion` | {{unit}} per portion | {{unit}} ku isahani | ⚠ needs review |
| `createItem.createInStock` | Create in stock | Bishyire mu bubiko | ⚠ needs review |
| `createItem.createInStockLabel` | Create {{name}} in stock | Shyira {{name}} mu bubiko | ⚠ needs review |
| `createItem.unmatchedNote_one` | {{count}} ingredient is not in stock yet — create it to link it to the recipe. | Ikiribwa {{count}} ntikiri mu bubiko — gishyiremo kugira ngo gihuzwe ni byo guteka. | ⚠ needs review |
| `createItem.unmatchedNote_other` | {{count}} ingredients are not in stock yet — create them to link them to the recipe. | Ibikoresho {{count}} ntibiri mu bubiko — bishyiremo kugira ngo bihuzwe ni byo guteka. | ⚠ needs review |
| `createItem.useSuggestion` | Use name {{name}} | Koresha izina {{name}} | ⚠ needs review |
| `editItem.title` | Edit Menu Item | Hindura ikiribwa cya menu | ⚠ needs review |
| `editItem.helpText` | Update the name, price or description of this menu item. | Hindura izina, igiciro cyangwa ibisobanuro by'iki kiribwa. | ⚠ needs review |
| `editItem.saveButton` | Save Changes | Bika impinduka | ⚠ needs review |
| `editItem.saveError` | Could not update the item. Try again. | Ntibyashobotse kuvugurura ifunguro. Ongera ugerageze. | ⚠ needs review |
| `editItem.removeError` | Could not remove the item. Try again. | Ntibyashobotse gukuraho ifunguro. Ongera ugerageze. | ⚠ needs review |
| `editItem.removeButton` | Remove | Kuraho | ⚠ needs review |
| `editItem.removeConfirmTitle` | Remove menu item? | Gukuraho ifunguro? | ⚠ needs review |
| `editItem.removeConfirmMessage` | {{name}} will be removed from your menu. Past sales stay in your records. | {{name}} izakurwa kuri menu yawe. Ubucuruzi bwabaye buguma mu nyandiko zawe. | ⚠ needs review |

## orders (69)

| Key | English source | Kinyarwanda draft | Status |
|---|---|---|---|
| `purchasing.title` | Requisition | Réquisition | ⚠ needs review |
| `purchasing.catalog` | Catalog | Katalogi | ⚠ needs review |
| `purchasing.orders` | Orders | Ibyatumwe | ⚠ needs review |
| `purchasing.share` | Share | Sangira | ⚠ needs review |
| `purchasing.deliveryReceiving` | Delivery Receiving | Kwakira ibibukuwe | ⚠ needs review |
| `purchasing.shareRequisition` | Share Requisition | Sangira réquisition | ⚠ needs review |
| `purchasing.noOrdersTitle` | No orders yet | Nta byatumwe kugeza ubu | ⚠ needs review |
| `purchasing.noOrdersDesc` | Go to the Catalog tab, add products to your cart, and place an order. | Jya ku gice cya Katalogi, ongeraho ibicuruzwa mu kagari no gutanga icyifuzo. | ⚠ needs review |
| `purchasing.noCatalogDesc` | No catalog products are available yet. You can log a delivery manually while you wait. | Nta bicuruzwa bihari kugeza ubu. | ⚠ needs review |
| `purchasing.browseCatalog` | Browse Catalog | Reba ibicuruzwa | ⚠ needs review |
| `purchasing.logDelivery` | Log a delivery manually | Andika ibibukuwe | ⚠ needs review |
| `purchasing.logDeliveryManually` | Log a delivery manually | Andika ibibukuwe | ⚠ needs review |
| `purchasing.placingOrder` | Placing Order… | Gutanga icyifuzo… | ⚠ needs review |
| `purchasing.orderFromFoodBundles` | Order from Food Bundles | Gura kuri Food Bundles | ⚠ needs review |
| `purchasing.priceTbc` | Price TBC | Igiciro gizashyirwaho | ⚠ needs review |
| `purchasing.shareLine` | • {{name}} — {{qty}} {{unit}} × {{price}} = {{total}} | • {{name}} — {{qty}} {{unit}} × {{price}} = {{total}} | ⚠ needs review |
| `purchasing.shareTitle` | Requisition — Food Bundles | Ibisabwa kugurwa — Food Bundles | ⚠ needs review |
| `purchasing.shareKitchen` | Kitchen: {{name}} | Igikoni: {{name}} | ⚠ needs review |
| `purchasing.shareDate` | Date: {{date}} | Itariki: {{date}} | ⚠ needs review |
| `purchasing.shareItems` | Items: | Ibintu: | ⚠ needs review |
| `purchasing.shareTotal` | Estimated total: {{total}} | Igiteranyo kigereranyijwe: {{total}} | ⚠ needs review |
| `purchasing.shareFooter` | Sent from Food Bundles Chef | Byoherejwe na Food Bundles Chef | ⚠ needs review |
| `purchasing.orderError` | Couldn't place the order. Check your connection and try again. | Gutumiza byanze. Genzura murandasi wongere ugerageze. | ⚠ needs review |
| `purchasing.orderShareTitle` | Order — Food Bundles | Itumiza — Food Bundles | ⚠ needs review |
| `purchasing.orderNumber` | Order {{id}} | Itumiza {{id}} | ⚠ needs review |
| `purchasing.orderShareStatus` | Status: {{status}} | Uko rihagaze: {{status}} | ⚠ needs review |
| `purchasing.orderShareDelivery` | Delivery: {{date}} | Kugezwaho: {{date}} | ⚠ needs review |
| `purchasing.orderShareFooter` | Sent from Food Bundles Chef | Byoherejwe na Food Bundles Chef | ⚠ needs review |
| `purchasing.cartLabel_one` | Cart, {{count}} item | Igitebo, ikintu {{count}} | ⚠ needs review |
| `purchasing.cartLabel_other` | Cart, {{count}} items | Igitebo, ibintu {{count}} | ⚠ needs review |
| `purchasing.searchProducts` | Search products… | Shakisha ibicuruzwa… | ⚠ needs review |
| `purchasing.noProductsFound` | No products found | Nta bicuruzwa byabonetse | ⚠ needs review |
| `purchasing.noCatalogTitle` | No products in the catalog yet | Nta bicuruzwa biri ku rutonde | ⚠ needs review |
| `purchasing.tryDifferentSearch` | Try a different search. | Gerageza gushakisha ukundi. | ⚠ needs review |
| `purchasing.noCatalogBody` | You can log a delivery by hand while the catalog is empty. | Ushobora kwandika ibyakiriwe ubwawe mu gihe urutonde rukiri ubusa. | ⚠ needs review |
| `purchasing.cartSummary_one` | {{count}} item · {{total}} | Ikintu {{count}} · {{total}} | ⚠ needs review |
| `purchasing.cartSummary_other` | {{count}} items · {{total}} | Ibintu {{count}} · {{total}} | ⚠ needs review |
| `purchasing.deliveryOn` | Delivery {{date}} | Kugezwaho {{date}} | ⚠ needs review |
| `purchasing.createdOn` | Created {{date}} | Ryakozwe {{date}} | ⚠ needs review |
| `purchasing.shareOrderLabel` | Share order {{id}} | Sangiza itumiza {{id}} | ⚠ needs review |
| `purchasing.qtyLabel` | Quantity of {{name}} | Ingano ya {{name}} | ⚠ needs review |
| `orders.detailTitle` | Order | Icyifuzo | ⚠ needs review |
| `orders.loadError` | Could not load order details. | Kutagira uburyo bwo gutangira amakuru y'icyifuzo. | ⚠ needs review |
| `orders.goBack` | Go back | Subira | ⚠ needs review |
| `orders.totalValue` | Total Value | Agaciro karimo | ⚠ needs review |
| `orders.delivery` | Delivery | Ibibukuwe | ⚠ needs review |
| `orders.shareRequisitionPdf` | Share Requisition PDF | Sangira PDF ya réquisition | ⚠ needs review |
| `orders.generatingPdf` | Generating PDF… | Gutunganya PDF… | ⚠ needs review |
| `orders.items` | Items ({{count}}) | Ibintu ({{count}}) | ⚠ needs review |
| `orders.noLineItems` | No line items found. | Nta n'imwe y'ibintu yabonetse. | ⚠ needs review |
| `orders.submitOrder` | Submit Order → Ready for Delivery | Ohereza icyifuzo → Biteguriye ibibukuwe | ⚠ needs review |
| `orders.submitting` | Submitting… | Kohereza… | ⚠ needs review |
| `orders.cancelOrder` | Cancel Order | Hagarika icyifuzo | ⚠ needs review |
| `orders.cancelling` | Cancelling… | Guhagarika… | ⚠ needs review |
| `orders.sharingUnavailable` | Sharing unavailable | Gusangira ntiboneka | ⚠ needs review |
| `orders.pdfSavedTo` | PDF saved to:<br>{{uri}} | PDF yabitswe:<br>{{uri}} | ⚠ needs review |
| `orders.pdfError` | Error | Ikosa | ⚠ needs review |
| `orders.pdfErrorDesc` | Could not generate PDF. Please try again. | Kutagira uburyo bwo gutunganya PDF. Ongera ugerageze. | ⚠ needs review |
| `orders.status.draft` | Draft | Ritaroherezwa | ⚠ needs review |
| `orders.status.submitted` | Submitted | Ryoherejwe | ⚠ needs review |
| `orders.status.confirmed` | Confirmed | Ryemejwe | ⚠ needs review |
| `orders.status.out_for_delivery` | Out for delivery | Riri mu nzira | ⚠ needs review |
| `orders.status.delivered` | Delivered | Ryagejejwe | ⚠ needs review |
| `orders.status.cancelled` | Cancelled | Ryahagaritswe | ⚠ needs review |
| `orders.shareAsPdf` | Share as PDF | Sangiza nka PDF | ⚠ needs review |
| `orders.sharePdfLabel` | Download or share the requisition PDF | Kuramo cyangwa usangize urutonde rwo kugura muri PDF | ⚠ needs review |
| `orders.submitOrderLabel` | Submit order | Ohereza itumiza | ⚠ needs review |
| `orders.onItsWay` | This order is on its way — contact Food Bundles support. | Iki cyifuzo kiri mu nzira — vugana n'abakozi bafasha ba Food Bundles. | ⚠ needs review |
| `orders.cancelFailed` | The order could not be cancelled. Try again. | Ntibyashobotse guhagarika icyifuzo. Ongera ugerageze. | ⚠ needs review |

## profile (45)

| Key | English source | Kinyarwanda draft | Status |
|---|---|---|---|
| `profile.title` | Profile | Umwirondoro | ⚠ needs review |
| `profile.phone` | Phone | Telefoni | ⚠ needs review |
| `profile.activeKitchen` | Active Kitchen | Igikoni Gikoreshwa | ⚠ needs review |
| `profile.noKitchen` | None selected | Nta ryatoranijwe | ⚠ needs review |
| `profile.manageKitchens` | Manage Kitchens | Gucunga Ibikoni | ⚠ needs review |
| `profile.signOut` | Sign Out | Sohoka | ⚠ needs review |
| `profile.saveProfile` | Save Profile | Bika umwirondoro | ⚠ needs review |
| `profile.openSettings` | Open settings | Fungura igenamiterere | ⚠ needs review |
| `profile.permissionNeeded` | Permission needed | Uburenganzira bukenewe | ⚠ needs review |
| `profile.permissionNeededDesc` | Allow access to continue. | Emeza kwinjira gukomeze. | ⚠ needs review |
| `profile.nameRequired` | Name required | Izina rirakenewe | ⚠ needs review |
| `profile.nameRequiredDesc` | Please enter your name. | Injiza izina ryawe. | ⚠ needs review |
| `profile.saveError` | Error | Ikosa | ⚠ needs review |
| `profile.saveErrorDesc` | Could not save profile. Please try again. | Ntibishoboka kubika umwirondoro. Gerageza nanone. | ⚠ needs review |
| `profile.signOutConfirmTitle` | Sign Out | Gusohoka | ⚠ needs review |
| `profile.signOutConfirmMsg` | Are you sure you want to sign out? | Uzi neza ko ushaka gusohoka? | ⚠ needs review |
| `profile.signOutConfirmCancel` | Cancel | Reka | ⚠ needs review |
| `profile.signOutConfirmAction` | Sign Out | Sohoka | ⚠ needs review |
| `profile.setYourName` | Set your name | Shyiraho izina ryawe | ⚠ needs review |
| `profile.cancelEditing` | Cancel editing | Hagarika guhindura | ⚠ needs review |
| `profile.editProfile` | Edit profile | Hindura umwirondoro | ⚠ needs review |
| `profile.displayNameLabel` | Display Name | Izina Rigaragara | ⚠ needs review |
| `profile.displayNamePlaceholder` | Your full name | Amazina yawe yose | ⚠ needs review |
| `profile.bioLabel` | Bio (optional) | Ibyo ari we (si ngombwa) | ⚠ needs review |
| `profile.bioPlaceholder` | Brief professional bio… | Ibisobanuro ngufi by'imirimo yawe… | ⚠ needs review |
| `profile.experienceLabel` | Experience | Uburambe | ⚠ needs review |
| `profile.experiencePlaceholder` | e.g. 8 years · French & Rwandan cuisine | urugero. imyaka 8 · Ituze rya Fransiya na Rw. | ⚠ needs review |
| `profile.memberSince` | Member since {{date}} | Umunyamuryango kuva {{date}} | ⚠ needs review |
| `profile.statsKitchens` | Kitchens | Ibikoni | ⚠ needs review |
| `profile.statsActive` | Active | Ikiri gukoreshwa | ⚠ needs review |
| `profile.sectionKitchen` | Kitchen | Igikoni | ⚠ needs review |
| `profile.sectionLinks` | Links | Itumanaho | ⚠ needs review |
| `profile.sectionAccount` | Account | Konti | ⚠ needs review |
| `profile.kitchenTapHint` | Tap to view details | Kanda kugirango ubone ibisobanuro | ⚠ needs review |
| `profile.kitchenSetupHint` | Set up your kitchen workspace | Shyiraho ahantu hawe ho gutumanahana | ⚠ needs review |
| `profile.kitchenAccessLabel` | View active kitchen details | Reba ibisobanuro by'igikoni gikoreshwa | ⚠ needs review |
| `profile.manageKitchensLabel` | Manage kitchens, {{count}} active | Gucunga amagataraga, {{count}} arikoreshwa | ⚠ needs review |
| `profile.linkReceiving` | Delivery Receiving | Kwakira Ibigurwa | ⚠ needs review |
| `profile.linkReceivingDesc` | Log and track deliveries | Injiza no gukurikira ibigurwa | ⚠ needs review |
| `profile.linkSales` | Sales & Reports | Ibyagurishijwe & Raporo | ⚠ needs review |
| `profile.linkSalesDesc` | Record daily sales | Injiza ibyagurishijwe bya buri munsi | ⚠ needs review |
| `profile.footerTagline` | Built for professional kitchen teams | Yubakiwe amatsinda y'amagataraga | ⚠ needs review |
| `profile.footerCopyright` | © Food Bundles | © Food Bundles | ⚠ needs review |
| `profile.photoLabel` | Profile photo | Ifoto y'umwirondoro | ⚠ needs review |
| `profile.photoLabelNamed` | Profile photo of {{name}} | Ifoto y'umwirondoro ya {{name}} | ⚠ needs review |

## sales (13)

| Key | English source | Kinyarwanda draft | Status |
|---|---|---|---|
| `sales.title` | Sales Entry | Kwandika ubuguzi | ⚠ needs review |
| `sales.recordToday` | Record portions sold today ({{date}}). | Andika amashami aguzwe uyu munsi ({{date}}). | ⚠ needs review |
| `sales.noActiveItems` | No active menu items. Add items to the menu first. | Nta biribwa bikoreshwa. Banza ongeraho ibiribwa kuri menu. | ⚠ needs review |
| `sales.saveSales` | Save Sales | Bika ubuguzi | ⚠ needs review |
| `sales.saving` | Saving… | Kubika… | ⚠ needs review |
| `sales.savedSnack` | Sales saved · Stock updated | Ubuguzi bubitswe · Ububiko buravuguruwe | ⚠ needs review |
| `sales.anomalyWarning` | looks much higher than usual — please confirm before saving. | biragaragara ko birenzeho bisanzwe — nyamuneka emeza mbere yo kubika. | ⚠ needs review |
| `sales.anomalyWarningPlural` | look much higher than usual — please confirm before saving. | biragaragara ko birenzeho bisanzwe — nyamuneka emeza mbere yo kubika. | ⚠ needs review |
| `sales.saveError_one` | {{count}} item could not be saved. Check your connection and save again. | Ikintu {{count}} nticyabitswe. Genzura murandasi wongere ubike. | ⚠ needs review |
| `sales.saveError_other` | {{count}} items could not be saved. Check your connection and save again. | Ibintu {{count}} ntibyabitswe. Genzura murandasi wongere ubike. | ⚠ needs review |
| `sales.enterPortionsHint` | Add portions sold to save. | Ongeraho amasahani yagurishijwe kugira ngo ubike. | ⚠ needs review |
| `sales.portions` | portions | amasahani | ⚠ needs review |
| `sales.portionsLabel` | {{name}}, portions sold | {{name}}, amasahani yagurishijwe | ⚠ needs review |

## settings (46)

| Key | English source | Kinyarwanda draft | Status |
|---|---|---|---|
| `settings.title` | Settings | Igenamiterere | ⚠ needs review |
| `settings.pushNotifications` | Push Notifications | Imenyesha | ⚠ needs review |
| `settings.dailyStockReminder` | Daily Stock Reminder | Ibutsa ry'ububiko bya buri munsi | ⚠ needs review |
| `settings.notificationsBlocked` | Notifications blocked | Imenyesha yarahagaritswe | ⚠ needs review |
| `settings.openSettings` | Open Settings | Fungura igenamiterere | ⚠ needs review |
| `settings.enableNotifications` | Enable | Fungura | ⚠ needs review |
| `settings.manageKitchens` | Manage Kitchens | Gucunga amagataraga | ⚠ needs review |
| `settings.manageKitchensSub` | Add, switch or archive kitchens | Ongeraho, hindura cyangwa shyira mu bubiko amagataraga | ⚠ needs review |
| `settings.syncData` | Refresh data | Vugurura amakuru | ⚠ needs review |
| `settings.syncDataSub` | Reload menus, stock, sales and orders | Ongera ufungure menu, ububiko, ibyagurishijwe n'amatumiza | ⚠ needs review |
| `settings.theme` | Theme | Incamake | ⚠ needs review |
| `settings.language` | Language | Ururimi | ⚠ needs review |
| `settings.contactSupport` | Contact Support | Vugana n'inkunga | ⚠ needs review |
| `settings.contactSupportSub` | support@foodbundles.rw | support@foodbundles.rw | ⚠ needs review |
| `settings.privacyPolicy` | Privacy Policy | Itegeko ry'ibanga | ⚠ needs review |
| `settings.privacyPolicySub` | How we handle your data | Uburyo tugenzura amakuru yawe | ⚠ needs review |
| `settings.signOut` | Sign Out | Sohoka | ⚠ needs review |
| `settings.deleteAccount` | Delete Account | Siba konti | ⚠ needs review |
| `settings.deleteAccountSub` | Permanently remove all data | Kuraho burundu amakuru yose | ⚠ needs review |
| `settings.sectionNotifications` | Notifications | Imenyesha | ⚠ needs review |
| `settings.notificationsOn` | On | Birakora | ⚠ needs review |
| `settings.notificationsDenied` | Blocked — change it in your device settings | Byahagaritswe — bihindure mu igenamiterere rya telefoni | ⚠ needs review |
| `settings.notificationsOff` | Not turned on yet | Ntibirafungurwa | ⚠ needs review |
| `settings.dailyStockReminderSub` | A reminder at 07:00 to check low-stock ingredients | Kwibutsa saa 07:00 kugenzura ibikoresho bigiye gushira | ⚠ needs review |
| `settings.notificationsBlockedBody` | Notifications are blocked for this app. Open your device settings to turn them on. | Imenyesha ryahagaritswe kuri iyi porogaramu. Fungura igenamiterere rya telefoni kugira ngo uryemerere. | ⚠ needs review |
| `settings.sectionKitchen` | Kitchen | Igikoni | ⚠ needs review |
| `settings.refreshing` | Refreshing… | Birimo kuvugururwa… | ⚠ needs review |
| `settings.refreshDone` | Data refreshed | Amakuru yavuguruwe | ⚠ needs review |
| `settings.refreshFailed` | Couldn't refresh — check your connection. | Kuvugurura byanze — genzura murandasi. | ⚠ needs review |
| `settings.sectionAppearance` | Appearance | Isura | ⚠ needs review |
| `settings.themeLight` | Light | Urumuri | ⚠ needs review |
| `settings.themeDark` | Dark | Umwijima | ⚠ needs review |
| `settings.themeSystem` | System | Nk'iya telefoni | ⚠ needs review |
| `settings.selected` | selected | byatoranyijwe | ⚠ needs review |
| `settings.sectionAi` | Assistant and AI | Umufasha na AI | ⚠ needs review |
| `settings.ai.spokenReplies` | Read replies aloud | Soma ibisubizo mu ijwi | ⚠ needs review |
| `settings.ai.spokenRepliesSub` | Short assistant replies are spoken in English or French. Off by default. | Ibisubizo bigufi by'umufasha bisomwa mu Cyongereza cyangwa mu Gifaransa. Bifunze mbere na mbere. | ⚠ needs review |
| `settings.ai.spokenRepliesNoRw` | Not available in Kinyarwanda yet — replies stay as text. | Ntibiraboneka mu Kinyarwanda — ibisubizo biguma ari inyandiko. | ⚠ needs review |
| `settings.ai.photosVoice` | AI help with photos and voice | Ubufasha bwa AI ku mafoto n'amajwi | ⚠ needs review |
| `settings.ai.photosVoiceSub` | Photos and voice are sent to an AI service only to read them, and are not kept by Food Bundles. | Amafoto n'amajwi byoherezwa kuri serivisi ya AI kugira ngo bisomwe gusa, kandi Food Bundles ntibibika. | ⚠ needs review |
| `settings.ai.consentNextUse` | You'll be asked to agree the next time you use AI. | Uzabazwa niba ubyemera ubutaha ukoresheje AI. | ⚠ needs review |
| `settings.sectionSupport` | Support | Ubufasha | ⚠ needs review |
| `settings.sectionAccount` | Account | Konti | ⚠ needs review |
| `settings.deleteAccountBody` | To permanently delete your account and all kitchen data, contact {{email}}. This cannot be undone. | Kugira ngo usibe burundu konti yawe n'amakuru yose y'ibikoni byawe, andikira {{email}}. Ntibishobora gusubizwa inyuma. | ⚠ needs review |
| `settings.version` | Version {{version}} | Verisiyo {{version}} | ⚠ needs review |
| `settings.galleryHint` | Long-press to open the UI gallery (development builds only) | Kanda igihe kirekire ufungure imbonerahamwe y'imiterere (ku miterere y'iterambere gusa) | ⚠ needs review |

## stock (121)

| Key | English source | Kinyarwanda draft | Status |
|---|---|---|---|
| `stock.title` | Stock | Ububiko | ⚠ needs review |
| `stock.orderNow` | Order now → | Gura ubu → | ⚠ needs review |
| `stock.emptyTitle` | No ingredients yet | Nta bikoresho kugeza ubu | ⚠ needs review |
| `stock.addIngredient` | Add Ingredient | Ongeraho ikiribwa | ⚠ needs review |
| `stock.outOfStock` | Out of Stock | Nta bubiko | ⚠ needs review |
| `stock.lowStock` | Low Stock | Ububiko buke | ⚠ needs review |
| `stock.inRecipe` | In Recipe | Mu guteka | ⚠ needs review |
| `stock.searchPlaceholder` | Search ingredients… | Shakisha ibikoresho… | ⚠ needs review |
| `stock.syncNow` | Sync now | Vugurura | ⚠ needs review |
| `stock.addIngredientLabel` | Add ingredient | Ongeraho ikiribwa | ⚠ needs review |
| `stock.filterAll` | All | Byose | ⚠ needs review |
| `stock.filterInStock` | In Stock | Bifite ububiko | ⚠ needs review |
| `stock.filterOutOfStock` | Out of Stock | Nta bubiko | ⚠ needs review |
| `stock.filterInRecipes` | In Recipes | Mu guteka | ⚠ needs review |
| `stock.reorderNeed_one` | {{count}} item needs reordering | {{count}} ikiribwa gikeneye guturukirwa | ⚠ needs review |
| `stock.reorderNeed_other` | {{count}} items need reordering | {{count}} ibikoresho bikeneye guturukirwa | ⚠ needs review |
| `stock.reorderTapHint` | {{count}} items need reordering — tap to open Requisitions | {{count}} ibikoresho bikeneye guturukirwa — kanda kugirango ugure | ⚠ needs review |
| `stock.emptyOutOfStockTitle` | No out-of-stock items | Nta bikoresho bitarimo ububiko | ⚠ needs review |
| `stock.emptyOutOfStockDesc` | Great — all ingredients have stock. | Byiza — ibikoresho byose bifite ububiko. | ⚠ needs review |
| `stock.emptyInStockTitle` | No items in stock | Nta bikoresho bifite ububiko | ⚠ needs review |
| `stock.emptyInStockDesc` | All ingredients are currently out of stock. | Ibikoresho byose nta bubiko bifite ubu. | ⚠ needs review |
| `stock.emptyInRecipesTitle` | No recipe ingredients yet | Nta byo gueka kugeza ubu | ⚠ needs review |
| `stock.emptyInRecipesDesc` | Link ingredients to your menu items to see them here. Open a menu item and add ingredients to its recipe. | Jyanisha ibikoresho n'ibiribwa bya menu kugirango ubibonehere hano. Fungura ikiribwa uhite wongeraho ibyo guteka. | ⚠ needs review |
| `stock.emptySearchTitle` | No results | Nta bisubizo | ⚠ needs review |
| `stock.emptySearchDesc` | Try a different search term. | Gerageza ijambo rindi. | ⚠ needs review |
| `stock.emptyDesc` | Add your ingredients to start tracking stock levels and purchase needs. | Ongeraho ibikoresho byawe kugirango ukurikire ingano z'ububiko n'ibikenewe kugura. | ⚠ needs review |
| `stock.addFirstIngredientLabel` | Add first ingredient | Ongeraho ikiribwa cya mbere | ⚠ needs review |
| `stock.aiHint` | You can also ask the AI Assistant to add ingredients for you. | Ushoboora no gusaba umufasha wa AI ko yongeraho ibikoresho. | ⚠ needs review |
| `stock.noStockReorder` | No stock — reorder needed | Nta bubiko — gusaba guturukirwa birakenewe | ⚠ needs review |
| `stock.onHand` | {{qty}} {{unit}} on hand | {{qty}} {{unit}} ziriho | ⚠ needs review |
| `stock.dailyUseRate` | {{qty}} {{unit}}/day | {{qty}} {{unit}}/ku munsi | ⚠ needs review |
| `stock.daysCoverLabel` | {{days}} days cover | {{days}} iminsi y'ububiko | ⚠ needs review |
| `stock.unlimitedCover` | unlimited cover | ububiko butagira aho bugarukira | ⚠ needs review |
| `stock.accessibilityRow` | {{name}}: {{stock}} {{unit}} on hand, {{cover}} | {{name}}: {{stock}} {{unit}} ziriho, {{cover}} | ⚠ needs review |
| `stock.reorderSuggest` | · {{name}} — suggest {{qty}} {{unit}} | · {{name}} — kugira {{qty}} {{unit}} | ⚠ needs review |
| `stock.noUsage` | No usage yet | Ntibirakoreshwa | ⚠ needs review |
| `stock.noUsageA11y` | No usage recorded yet | Nta mikoreshereze yanditswe | ⚠ needs review |
| `stock.daysUnit_one` | day | umunsi | ⚠ needs review |
| `stock.daysUnit_other` | days | iminsi | ⚠ needs review |
| `stock.coverA11y_one` | Stock {{level}}: {{days}} day of cover | Ububiko {{level}}: umunsi {{days}} | ⚠ needs review |
| `stock.coverA11y_other` | Stock {{level}}: {{days}} days of cover | Ububiko {{level}}: iminsi {{days}} | ⚠ needs review |
| `stock.level.critical` | critical | buri mu kaga | ⚠ needs review |
| `stock.level.low` | low | buke | ⚠ needs review |
| `stock.level.ok` | OK | buhagije | ⚠ needs review |
| `ingredients.addTitle` | Add Ingredient | Ongeraho ikiribwa | ⚠ needs review |
| `ingredients.helpText` | Add ingredients you stock and use in recipes. You can set quantities and costs later. | Ongeraho ibikoresho ubika kandi ukoreshe mu guteka kwawe. | ⚠ needs review |
| `ingredients.nameSectionLabel` | Ingredient Name * | Izina ry'ikiribwa * | ⚠ needs review |
| `ingredients.namePlaceholder` | e.g. Banana, Ginger, Tomato | urugero. Igitoki, Tangawizi, Tomato | ⚠ needs review |
| `ingredients.nameError` | Enter a name (at least 2 characters) | Injiza izina (nibura inyuguti 2) | ⚠ needs review |
| `ingredients.unitSectionLabel` | Unit of Measurement * | Ingero y'ipimiro * | ⚠ needs review |
| `ingredients.unitError` | Select or type a unit | Hitamo cyangwa injiza ingero | ⚠ needs review |
| `ingredients.otherUnit` | Other… | Ikindi… | ⚠ needs review |
| `ingredients.customUnitPlaceholder` | Type your unit (e.g. 'portion', 'tray') | Injiza ingero yawe (urugero. 'igice', 'plateau') | ⚠ needs review |
| `ingredients.addButton` | Add Ingredient | Ongeraho ikiribwa | ⚠ needs review |
| `ingredients.detailTitle` | Ingredient | Ikiribwa | ⚠ needs review |
| `ingredients.notFound` | Ingredient not found. | Ikiribwa ntigibonetse. | ⚠ needs review |
| `ingredients.invalidQty` | Invalid quantity | Ingano ntiyemewe | ⚠ needs review |
| `ingredients.invalidQtyDesc` | Enter a positive number. | Injiza umubare utarenganya 0. | ⚠ needs review |
| `ingredients.adjustError` | Error | Ikosa | ⚠ needs review |
| `ingredients.adjustErrorDesc` | Could not update stock. Please try again. | Kutagira uburyo bwo kuvugurura ububiko. Ongera ugerageze. | ⚠ needs review |
| `ingredients.currentStock` | Current Stock | Ububiko buhari | ⚠ needs review |
| `ingredients.outOfStock` | Out of Stock | Nta bubiko | ⚠ needs review |
| `ingredients.dailyUse` | Daily use: {{use}} {{unit}}/day | Imikoreshereze ya buri munsi: {{use}} {{unit}}/umunsi | ⚠ needs review |
| `ingredients.daysCover` |  · {{days}} days cover |  · Iminsi {{days}} yo gufunika | ⚠ needs review |
| `ingredients.lastUpdated` | Last updated {{date}} | Ivugurura rya nyuma {{date}} | ⚠ needs review |
| `ingredients.adjustStock` | Adjust Stock | Hindura ububiko | ⚠ needs review |
| `ingredients.qtyPlaceholder` | Qty ({{unit}}) | Ingano ({{unit}}) | ⚠ needs review |
| `ingredients.addStockLabel` | Add stock | Ongeraho ububiko | ⚠ needs review |
| `ingredients.removeStockLabel` | Remove stock | Kuraho ububiko | ⚠ needs review |
| `ingredients.add` | Add | Ongeraho | ⚠ needs review |
| `ingredients.remove` | Remove | Kuraho | ⚠ needs review |
| `ingredients.notePlaceholder` | Note (optional) | Icyitonderwa (ntibisabwa) | ⚠ needs review |
| `ingredients.detailsSection` | Details | Amakuru | ⚠ needs review |
| `ingredients.detailUnit` | Unit | Ingero | ⚠ needs review |
| `ingredients.detailQtyPerPortion` | Qty per portion | Ingano ku gice | ⚠ needs review |
| `ingredients.detailYield` | Yield fraction | Fraction ya rendement | ⚠ needs review |
| `ingredients.detailCostPerUnit` | Cost per unit | Ikiguzi ku ngero | ⚠ needs review |
| `ingredients.detailDaysOpen` | Days open/week | Iminsi ifunguye/icyumweru | ⚠ needs review |
| `ingredients.detailNotes` | Notes | Ibinotisi | ⚠ needs review |
| `ingredients.usedInMenu` | Used in Menu Items | Bikoreshwa mu biribwa bya menu | ⚠ needs review |
| `ingredients.noMenuItems` | No menu items yet. Add items to your menu and link this ingredient to track food cost and stock usage. | Nta biribwa kugeza ubu. Ongeraho ibiribwa kuri menu yawe kandi uhuze iki kiribwa. | ⚠ needs review |
| `ingredients.stockHistory` | Stock History | Amateka y'ububiko | ⚠ needs review |
| `ingredients.noHistory` | No stock entries recorded yet. | Nta n'imwe y'ububiko yanditswe. | ⚠ needs review |
| `ingredients.entryOpening` | Opening | Ifungura | ⚠ needs review |
| `ingredients.entryAdjustment` | Adjustment | Ihindurwa | ⚠ needs review |
| `ingredients.entryClosing` | Closing | Ifungwa | ⚠ needs review |
| `ingredients.entryDelivery` | Delivery | Ibibukuwe | ⚠ needs review |
| `ingredients.offMenu` | Off Menu | Hanze ya menu | ⚠ needs review |
| `ingredients.nameLabel` | Ingredient name | Izina ry'ikiribwa | ⚠ needs review |
| `ingredients.unitGroupLabel` | Unit of measurement | Ingero y'igipimo | ⚠ needs review |
| `ingredients.customUnitLabel` | Enter a custom unit | Injiza ingero yawe | ⚠ needs review |
| `ingredients.customUnitInputLabel` | Custom unit of measurement | Ingero y'igipimo yawe | ⚠ needs review |
| `ingredients.addError` | Error | Ikosa | ⚠ needs review |
| `ingredients.addErrorDesc` | Could not add ingredient. Please try again. | Ntishoboka kongera ikiribwa. Gerageza nanone. | ⚠ needs review |
| `ingredients.kbDone` | Done | Rangiza | ⚠ needs review |
| `ingredients.formIncomplete` | Enter a name and choose a unit to continue. | Andika izina kandi uhitemo igipimo kugira ngo ukomeze. | ⚠ needs review |
| `ingredients.addedToStock` | Added to stock | Byongewe mu bubiko | ⚠ needs review |
| `ingredients.removedFromStock` | Removed from stock | Byakuwe mu bubiko | ⚠ needs review |
| `ingredients.yieldError` | Enter a yield between 1 and 100%. | Andika igice kiri hagati ya 1 na 100%. | ⚠ needs review |
| `ingredients.updated` | Ingredient updated | Ikiribwa cyavuguruwe | ⚠ needs review |
| `ingredients.updateError` | Couldn't save the changes. Try again. | Kubika impinduka byanze. Ongera ugerageze. | ⚠ needs review |
| `ingredients.deleteError` | Couldn't delete the ingredient. Try again. | Gusiba ikiribwa byanze. Ongera ugerageze. | ⚠ needs review |
| `ingredients.addQty` | Add {{qty}} {{unit}} | Ongeraho {{qty}} {{unit}} | ⚠ needs review |
| `ingredients.removeConfirmTitle` | Remove from stock? | Gukura mu bubiko? | ⚠ needs review |
| `ingredients.removeConfirmMessage` | Remove {{qty}} {{unit}} of {{name}} from stock? | Ukura {{qty}} {{unit}} bya {{name}} mu bubiko? | ⚠ needs review |
| `ingredients.saveChanges` | Save changes | Bika impinduka | ⚠ needs review |
| `ingredients.deleteIngredient` | Delete ingredient | Siba ikiribwa | ⚠ needs review |
| `ingredients.deleteConfirmTitle` | Delete ingredient? | Gusiba ikiribwa? | ⚠ needs review |
| `ingredients.deleteConfirmMessage` | {{name}} will be removed from your ingredients. | {{name}} izakurwa ku rutonde rw'ibikoresho byawe. | ⚠ needs review |
| `ingredients.editDetails` | Edit details | Hindura ibisobanuro | ⚠ needs review |
| `ingredients.costPerUnitLabel` | Cost per {{unit}} | Ikiguzi kuri {{unit}} | ⚠ needs review |
| `ingredients.costHint` | Used to work out food cost and suggested prices. | Gikoreshwa mu kubara ikiguzi cy'ibiribwa n'ibiciro bisabwa. | ⚠ needs review |
| `ingredients.yieldLabel` | Usable yield (%) | Igice gikoreshwa (%) | ⚠ needs review |
| `ingredients.yieldHint` | Share left after peeling or trimming, e.g. 80 = 80%. Use 100 when nothing is wasted. | Igice gisigara nyuma yo gutonora cyangwa gusukura, urugero 80 = 80%. Andika 100 niba nta gipfa ubusa. | ⚠ needs review |
| `ingredients.adjustQtyLabel` | Quantity to add or remove | Ingano yo kongeramo cyangwa gukuramo | ⚠ needs review |
| `ingredients.noteLabel` | Note | Icyitonderwa | ⚠ needs review |
| `ingredients.noCost` | No cost set | Nta kiguzi cyashyizweho | ⚠ needs review |
| `ingredients.levelAfter` | Level after: {{qty}} {{unit}} | Bizaba: {{qty}} {{unit}} | ⚠ needs review |
| `ingredients.costCurrencyLabel` | Cost currency | Ifaranga ry'ikiguzi | ⚠ needs review |
| `ingredients.costCurrencyHint` | Keep the currency your supplier charges in. Food cost converts it at the day's rate. | Gumana ifaranga umucuruzi wawe akoresha. Ikiguzi cy'ibiryo kirihindura ku gipimo cy'uwo munsi. | ⚠ needs review |
| `ingredients.costCurrencyOff` | Currency conversion is not available for this kitchen yet, so this cost is left out of food cost. | Guhindura amafaranga ntibirashoboka kuri iki gikoni, bityo iki giciro ntikibarwa mu giciro cy'ibiryo. | ⚠ needs review |
