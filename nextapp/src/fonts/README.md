# Icon font

`material-symbols.woff2` is a ~5 KB **subset** of Google's Material Symbols
(Outlined, weight 400, no fill) holding only the icons the app uses. It is
rendered by `components/ui/Icon.jsx` through ligatures: `<Icon name="home" />`.

An icon missing from the subset renders as its plain name, so add new icons here
first. Browse names at https://fonts.google.com/icons, then, from `nextapp/src`:

```sh
ICONS="admin_panel_settings,bar_chart,bed,calendar_today,check_circle,credit_card,dashboard,directions_bus,explore,groups,history,hotel,hourglass_top,location_on,luggage,manage_accounts,meeting_room,menu_book,payments,receipt_long,room_service,science,search_off,settings"   # + your new ones
URL=$(curl -s -A "Mozilla/5.0 Chrome/120" \
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&icon_names=$ICONS" \
  | sed -n 's/.*src: url(\([^)]*\)).*/\1/p' | head -1)
curl -s -o fonts/material-symbols.woff2 "$URL"
```

Included now: admin_panel_settings, bar_chart, bed, calendar_today,
check_circle, credit_card, dashboard, directions_bus, explore, groups, history,
hotel, hourglass_top, location_on, luggage, manage_accounts, meeting_room,
menu_book, payments, receipt_long, room_service, science, search_off, settings.
