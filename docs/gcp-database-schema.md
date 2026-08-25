# Schema de base de datos — GCP (BigQuery)

Proyecto GCP: `project-scrappy-intelic`. Dataset: `project_ether`.

> ⚠️ El JSON de la cuenta de servicio (`project-scrappy-intelic-a7055d2d24a2.json`) es una private key real.
> Ya está en `.gitignore` para que no se suba por accidente. Como esa key ya circuló en texto plano
> (este archivo, el chat), lo ideal es **rotarla** desde IAM → Service Accounts → Keys una vez migres
> cualquier automatización que la use. En producción (Vercel) se carga como variable de entorno
> `GCP_SERVICE_ACCOUNT_KEY_BASE64` marcada **Sensitive**, nunca como archivo en el repo — ver `.env.example`.

## 0. Antes de pegar esto: BigQuery no es la base "en vivo" del juego

BigQuery es un data warehouse analítico (OLAP), no una base transaccional (OLTP). Diferencias que importan acá:

- **`PRIMARY KEY` / `FOREIGN KEY` no se aplican de verdad.** Hay que declararlos `NOT ENFORCED` — son solo pistas para el optimizador y herramientas de BI, no evitan duplicados ni relaciones rotas.
- **No existe `UNIQUE` ni `CHECK`.** Cosas como "un username no se repite" o "`stars` entre 0 y 3" hay que validarlas en la aplicación, no en la base.
- **No hay autoincrement/`SERIAL`.** Todos los ids se generan con `GENERATE_UUID()` como `STRING`.
- **Actualizar filas individuales es caro y tiene límites.** Restar oro, sumar exp, marcar un item como equipado — cada una de esas es una fila que cambia todo el tiempo. BigQuery está optimizado para escribir en bloque y leer mucho, no para miles de updates de una fila por segundo.

**Para un prototipo/demo o para pegar y tener algo andando ya, esto funciona.** Pero para el juego real, lo sano es:
- **Cloud SQL (Postgres) o Firestore** para las tablas que cambian todo el tiempo por acción del jugador (`users`, `user_currencies`, `user_creatures`, `user_equipment`, progreso de campaña, etc.)
- **BigQuery** para lo que es naturalmente un log append-only y se consulta para analítica: `login_history`, `gacha_pull_history`, `pvp_match_history`.

Abajo tenés las queries para BigQuery tal como las pediste. Si en algún momento querés el mismo schema en Postgres (para Cloud SQL), avisame y te lo vuelvo a convertir.

## 1. Dataset

```sql
CREATE SCHEMA IF NOT EXISTS `project-scrappy-intelic.project_ether`
OPTIONS (location = 'US');
```

## 2. Convención general

- **Tablas de catálogo** (`*_catalog`): contenido diseñado en código (creatures, equipment, stages, missions, skills, banners), equivalente a tu `lib/gameData.ts`. Se siembran con un script, no las toca el jugador. `id` es `STRING` con el mismo slug que ya usás (`"dg-stage-1"`, `"dragoon"`, ...).
- **Tablas de usuario** (`user_*`): progreso real del jugador, siempre referenciando `users.id`.
- No hay `ENUM` en BigQuery: los campos que antes eran enum (`rarity`, `element`, etc.) son `STRING`, con un comentario listando los valores válidos — el rango se valida en la app.
- Tablas de eventos/log (`login_history`, `gacha_pull_history`, `pvp_match_history`) usan `PARTITION BY` (por fecha) y `CLUSTER BY` (por `user_id`) en vez de índices, que es como BigQuery optimiza esas consultas.

## 3. Usuarios, registro y login

```sql
CREATE TABLE `project-scrappy-intelic.project_ether.users` (
  id                 STRING DEFAULT GENERATE_UUID(),
  username           STRING NOT NULL,   -- único en la app (comparar en minúsculas); BigQuery no aplica UNIQUE
  password_hash      STRING NOT NULL,   -- hash bcrypt/argon2id, nunca el password en texto plano
  email              STRING,   -- required by the app at registration time even though the column stays nullable
  display_name       STRING NOT NULL,
  title              STRING DEFAULT 'Novice Tamer',
  avatar_key         STRING DEFAULT 'default',
  level              INT64 DEFAULT 1,
  exp                INT64 DEFAULT 0,
  exp_to_next_level  INT64 DEFAULT 100,
  is_online          BOOL DEFAULT false,
  is_in_battle       BOOL DEFAULT false,
  last_seen_at       TIMESTAMP,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  is_admin           BOOL DEFAULT false,   -- added via ALTER TABLE after the fact; NEVER set automatically at registration — only granted by hand (a one-off UPDATE), since registration is public
  PRIMARY KEY (id) NOT ENFORCED
)
CLUSTER BY username;

-- Auditoría de logeos (log append-only -> partition por día)
CREATE TABLE `project-scrappy-intelic.project_ether.login_history` (
  id             STRING DEFAULT GENERATE_UUID(),
  user_id        STRING NOT NULL,
  success        BOOL DEFAULT true,  -- registra también intentos fallidos (fuerza bruta)
  ip_address     STRING,
  user_agent     STRING,
  logged_in_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (id) NOT ENFORCED,
  FOREIGN KEY (user_id) REFERENCES `project-scrappy-intelic.project_ether.users`(id) NOT ENFORCED
)
PARTITION BY DATE(logged_in_at)
CLUSTER BY user_id;

-- Economía (cambia todo el tiempo -> primera candidata a vivir en Cloud SQL en vez de acá)
CREATE TABLE `project-scrappy-intelic.project_ether.user_currencies` (
  user_id               STRING NOT NULL,
  gold                  INT64 DEFAULT 0,
  gems                  INT64 DEFAULT 0,
  energy                INT64 DEFAULT 0,
  energy_max            INT64 DEFAULT 120,
  energy_regen_minutes  INT64 DEFAULT 5,
  last_energy_tick_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (user_id) NOT ENFORCED,
  FOREIGN KEY (user_id) REFERENCES `project-scrappy-intelic.project_ether.users`(id) NOT ENFORCED
);
```

## 4. Catálogo de contenido (monstruos, skills, equipo, items, etapas, misiones, banners)

```sql
CREATE TABLE `project-scrappy-intelic.project_ether.creatures_catalog` (
  id               STRING NOT NULL,   -- ej: 'dragoon', 'emberling'
  name             STRING NOT NULL,
  element          STRING NOT NULL,   -- 'Fire'|'Water'|'Nature'|'Light'|'Dark'|'Electric'|'Neutral'
  rarity           STRING NOT NULL,   -- 'Common'|'Rare'|'SSR'|'Mythic'
  evolution_stage  INT64 DEFAULT 1,  -- 1..3, validar en la app
  sprite_key       STRING NOT NULL,
  sprite_folder    STRING,
  base_hp          INT64 NOT NULL,
  base_atk         INT64 NOT NULL,
  base_def         INT64 NOT NULL,
  base_spd         INT64 NOT NULL,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (id) NOT ENFORCED
);

CREATE TABLE `project-scrappy-intelic.project_ether.skills_catalog` (
  id             STRING NOT NULL,
  name           STRING NOT NULL,
  description    STRING NOT NULL,
  type           STRING NOT NULL,   -- 'Attack'|'Defense'|'Support'|'Passive'
  power          INT64 NOT NULL,
  cooldown       INT64 NOT NULL,
  unlock_level   INT64 DEFAULT 1,
  PRIMARY KEY (id) NOT ENFORCED
);

CREATE TABLE `project-scrappy-intelic.project_ether.creature_skills` (
  creature_id  STRING NOT NULL,
  skill_id     STRING NOT NULL,
  slot         INT64 NOT NULL,   -- 1..4, validar en la app
  PRIMARY KEY (creature_id, slot) NOT ENFORCED,
  FOREIGN KEY (creature_id) REFERENCES `project-scrappy-intelic.project_ether.creatures_catalog`(id) NOT ENFORCED,
  FOREIGN KEY (skill_id) REFERENCES `project-scrappy-intelic.project_ether.skills_catalog`(id) NOT ENFORCED
);

CREATE TABLE `project-scrappy-intelic.project_ether.equipment_catalog` (
  id        STRING NOT NULL,
  name      STRING NOT NULL,
  slot      STRING NOT NULL,   -- 'Weapon'|'Helmet'|'Armor'|'Gloves'|'Boots'|'Necklace'|'Ring'|'Belt'|'Wings'|'Aura'
  rarity    STRING NOT NULL,   -- 'Common'|'Rare'|'SSR'|'Mythic'
  set_name  STRING,
  base_hp   INT64 DEFAULT 0,
  base_atk  INT64 DEFAULT 0,
  base_def  INT64 DEFAULT 0,
  base_spd  INT64 DEFAULT 0,
  PRIMARY KEY (id) NOT ENFORCED
);

-- Consumibles / materiales, distinto del equipo (armas/armaduras)
CREATE TABLE `project-scrappy-intelic.project_ether.items_catalog` (
  id           STRING NOT NULL,
  name         STRING NOT NULL,
  description  STRING,
  category     STRING NOT NULL,   -- 'material' | 'consumable' | 'currency_pack' | ...
  icon_key     STRING,
  stackable    BOOL DEFAULT true,
  max_stack    INT64 DEFAULT 999,
  PRIMARY KEY (id) NOT ENFORCED
);

CREATE TABLE `project-scrappy-intelic.project_ether.dungeon_stages_catalog` (
  id                     STRING NOT NULL,   -- ej: 'dg-stage-1'
  stage_number           INT64 NOT NULL,
  world                  INT64 NOT NULL,
  world_stage_number     INT64 NOT NULL,    -- (world, world_stage_number) único: validar en la app
  name                   STRING NOT NULL,
  difficulty             STRING NOT NULL,   -- 'Normal'|'Hard'|'Nightmare'
  stamina_cost           INT64 NOT NULL,
  recommended_power      INT64 NOT NULL,
  reward_gold            INT64 NOT NULL,
  reward_exp             INT64 NOT NULL,
  equipment_drop_chance  INT64 NOT NULL,    -- 0..100, validar en la app
  PRIMARY KEY (id) NOT ENFORCED
);

CREATE TABLE `project-scrappy-intelic.project_ether.missions_catalog` (
  id            STRING NOT NULL,
  description   STRING NOT NULL,
  target        INT64 NOT NULL,
  reward_gold   INT64 DEFAULT 0,
  reward_gems   INT64 DEFAULT 0,
  is_daily      BOOL DEFAULT true,
  PRIMARY KEY (id) NOT ENFORCED
);

CREATE TABLE `project-scrappy-intelic.project_ether.gacha_banners_catalog` (
  id                STRING NOT NULL,
  name              STRING NOT NULL,
  tagline           STRING,
  type              STRING NOT NULL,   -- 'Creature'|'Equipment'
  banner_image      STRING,
  single_pull_cost  INT64 NOT NULL,
  multi_pull_cost   INT64 NOT NULL,
  multi_pull_count  INT64 NOT NULL,
  starts_at         TIMESTAMP,
  ends_at           TIMESTAMP,
  PRIMARY KEY (id) NOT ENFORCED
);

CREATE TABLE `project-scrappy-intelic.project_ether.gacha_banner_featured` (
  banner_id              STRING NOT NULL,
  featured_creature_id   STRING,   -- uno de los dos, validar en la app
  featured_equipment_id  STRING,
  FOREIGN KEY (banner_id) REFERENCES `project-scrappy-intelic.project_ether.gacha_banners_catalog`(id) NOT ENFORCED,
  FOREIGN KEY (featured_creature_id) REFERENCES `project-scrappy-intelic.project_ether.creatures_catalog`(id) NOT ENFORCED,
  FOREIGN KEY (featured_equipment_id) REFERENCES `project-scrappy-intelic.project_ether.equipment_catalog`(id) NOT ENFORCED
);
```

## 5. Inventario del usuario (monstruos e items)

```sql
-- Inventario de monstruos: una fila por (user_id, creature_id) — los duplicados NO generan una
-- fila nueva, suman a `copies` en la fila existente (ver grantCreatureToUser en lib/db/bigquery.ts).
CREATE TABLE `project-scrappy-intelic.project_ether.user_creatures` (
  id                 STRING DEFAULT GENERATE_UUID(),
  user_id            STRING NOT NULL,
  creature_id        STRING NOT NULL,
  level              INT64 DEFAULT 1,
  exp                INT64 DEFAULT 0,
  exp_to_next_level  INT64 DEFAULT 100,
  hp                 INT64 NOT NULL,
  atk                INT64 NOT NULL,
  def                INT64 NOT NULL,
  spd                INT64 NOT NULL,
  is_in_hub_team     BOOL DEFAULT false,  -- máx. 7 por usuario, validar en la app (HUB_TEAM_SIZE)
  party_slot         INT64,   -- 1..3, único por usuario; validar en la app
  copies             INT64 DEFAULT 1,  -- añadida via ALTER TABLE; dupes de la misma criatura suman acá
                                        -- en vez de crear otra fila — pensado para un futuro sistema
                                        -- de "overlock"/limit break que consuma estas copias
  acquired_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (id) NOT ENFORCED,
  FOREIGN KEY (user_id) REFERENCES `project-scrappy-intelic.project_ether.users`(id) NOT ENFORCED,
  FOREIGN KEY (creature_id) REFERENCES `project-scrappy-intelic.project_ether.creatures_catalog`(id) NOT ENFORCED
)
CLUSTER BY user_id;

-- Inventario de equipo
CREATE TABLE `project-scrappy-intelic.project_ether.user_equipment` (
  id                 STRING DEFAULT GENERATE_UUID(),
  user_id            STRING NOT NULL,
  equipment_id       STRING NOT NULL,
  enhancement_level  INT64 DEFAULT 0,  -- 0..10, validar en la app
  equipped_to        STRING,   -- user_creatures.id, o NULL si no está equipado
  acquired_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (id) NOT ENFORCED,
  FOREIGN KEY (user_id) REFERENCES `project-scrappy-intelic.project_ether.users`(id) NOT ENFORCED,
  FOREIGN KEY (equipment_id) REFERENCES `project-scrappy-intelic.project_ether.equipment_catalog`(id) NOT ENFORCED,
  FOREIGN KEY (equipped_to) REFERENCES `project-scrappy-intelic.project_ether.user_creatures`(id) NOT ENFORCED
)
CLUSTER BY user_id;

-- Materiales/consumibles, se acumulan por cantidad (no son instancias únicas)
CREATE TABLE `project-scrappy-intelic.project_ether.user_items` (
  user_id      STRING NOT NULL,
  item_id      STRING NOT NULL,
  quantity     INT64 DEFAULT 0,  -- >= 0, validar en la app
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (user_id, item_id) NOT ENFORCED,
  FOREIGN KEY (user_id) REFERENCES `project-scrappy-intelic.project_ether.users`(id) NOT ENFORCED,
  FOREIGN KEY (item_id) REFERENCES `project-scrappy-intelic.project_ether.items_catalog`(id) NOT ENFORCED
);
```

## 6. Progreso de campaña (etapa en la que está)

```sql
CREATE TABLE `project-scrappy-intelic.project_ether.user_stage_progress` (
  user_id             STRING NOT NULL,
  stage_id            STRING NOT NULL,
  is_cleared          BOOL DEFAULT false,
  stars               INT64 DEFAULT 0,  -- 0..3, validar en la app
  best_clear_time_ms  INT64,
  cleared_at          TIMESTAMP,
  PRIMARY KEY (user_id, stage_id) NOT ENFORCED,
  FOREIGN KEY (user_id) REFERENCES `project-scrappy-intelic.project_ether.users`(id) NOT ENFORCED,
  FOREIGN KEY (stage_id) REFERENCES `project-scrappy-intelic.project_ether.dungeon_stages_catalog`(id) NOT ENFORCED
);

-- Estado "en vivo" de la campaña (equivalente a DungeonProgress del store)
CREATE TABLE `project-scrappy-intelic.project_ether.user_dungeon_state` (
  user_id                STRING NOT NULL,
  highest_stage_cleared  INT64 DEFAULT 0,
  current_wave           INT64 DEFAULT 0,
  auto_battle_enabled    BOOL DEFAULT false,
  auto_dg_enabled        BOOL DEFAULT false,
  speed_multiplier       INT64 DEFAULT 1,  -- 1|2|4, validar en la app
  PRIMARY KEY (user_id) NOT ENFORCED,
  FOREIGN KEY (user_id) REFERENCES `project-scrappy-intelic.project_ether.users`(id) NOT ENFORCED
);
```

## 7. Misiones

```sql
-- assigned_date es la clave del reseteo diario: cada día nuevo, nuevas filas
CREATE TABLE `project-scrappy-intelic.project_ether.user_missions` (
  user_id         STRING NOT NULL,
  mission_id      STRING NOT NULL,
  progress        INT64 DEFAULT 0,
  claimed         BOOL DEFAULT false,
  assigned_date   DATE DEFAULT CURRENT_DATE(),
  claimed_at      TIMESTAMP,
  PRIMARY KEY (user_id, mission_id, assigned_date) NOT ENFORCED,
  FOREIGN KEY (user_id) REFERENCES `project-scrappy-intelic.project_ether.users`(id) NOT ENFORCED,
  FOREIGN KEY (mission_id) REFERENCES `project-scrappy-intelic.project_ether.missions_catalog`(id) NOT ENFORCED
);
```

## 8. Amigos

```sql
CREATE TABLE `project-scrappy-intelic.project_ether.friend_requests` (
  id             STRING DEFAULT GENERATE_UUID(),
  requester_id   STRING NOT NULL,
  addressee_id   STRING NOT NULL,   -- distinto de requester_id, validar en la app
  status         STRING DEFAULT 'pending',  -- 'pending'|'accepted'|'declined'|'cancelled'
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  resolved_at    TIMESTAMP,
  PRIMARY KEY (id) NOT ENFORCED,
  FOREIGN KEY (requester_id) REFERENCES `project-scrappy-intelic.project_ether.users`(id) NOT ENFORCED,
  FOREIGN KEY (addressee_id) REFERENCES `project-scrappy-intelic.project_ether.users`(id) NOT ENFORCED
);
-- No hay índice único parcial en BigQuery: antes de insertar, la app debe chequear
-- que no exista ya un pending con el mismo (requester_id, addressee_id).

-- Relación ya aceptada, guardada una sola vez por par (orden canónico: user_id_a < user_id_b)
CREATE TABLE `project-scrappy-intelic.project_ether.friendships` (
  user_id_a   STRING NOT NULL,
  user_id_b   STRING NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (user_id_a, user_id_b) NOT ENFORCED,
  FOREIGN KEY (user_id_a) REFERENCES `project-scrappy-intelic.project_ether.users`(id) NOT ENFORCED,
  FOREIGN KEY (user_id_b) REFERENCES `project-scrappy-intelic.project_ether.users`(id) NOT ENFORCED
);
```

> `FriendStatus` ("Online"/"In Battle"/"Offline") no se guarda como columna de la amistad: se calcula
> en el momento de la consulta a partir de `users.is_online` / `users.is_in_battle` / `users.last_seen_at`.

## 9. Ranking PvP

```sql
CREATE TABLE `project-scrappy-intelic.project_ether.pvp_profiles` (
  user_id                    STRING NOT NULL,
  tier                       STRING DEFAULT 'Bronze',  -- 'Bronze'|'Silver'|'Gold'|'Platinum'|'Diamond'|'Grandmaster'
  rank                       INT64,
  rating                     INT64 DEFAULT 1000,
  power                      INT64 DEFAULT 0,
  defense_team_creature_ids  ARRAY<STRING>,  -- ids de user_creatures.id
  wins                       INT64 DEFAULT 0,
  losses                     INT64 DEFAULT 0,
  updated_at                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (user_id) NOT ENFORCED,
  FOREIGN KEY (user_id) REFERENCES `project-scrappy-intelic.project_ether.users`(id) NOT ENFORCED
)
CLUSTER BY rating;

CREATE TABLE `project-scrappy-intelic.project_ether.pvp_match_history` (
  id                      STRING DEFAULT GENERATE_UUID(),
  attacker_id             STRING NOT NULL,
  defender_id             STRING NOT NULL,
  winner_id               STRING,
  attacker_rating_change  INT64 DEFAULT 0,
  defender_rating_change  INT64 DEFAULT 0,
  played_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (id) NOT ENFORCED,
  FOREIGN KEY (attacker_id) REFERENCES `project-scrappy-intelic.project_ether.users`(id) NOT ENFORCED,
  FOREIGN KEY (defender_id) REFERENCES `project-scrappy-intelic.project_ether.users`(id) NOT ENFORCED
)
PARTITION BY DATE(played_at)
CLUSTER BY attacker_id;
```

## 10. Gremios (bonus — ya existe `GuildInfo`/`GuildMember` en `types/game.ts`)

```sql
CREATE TABLE `project-scrappy-intelic.project_ether.guilds` (
  id           STRING DEFAULT GENERATE_UUID(),
  name         STRING NOT NULL,   -- único, validar en la app
  level        INT64 DEFAULT 1,
  member_cap   INT64 DEFAULT 30,
  description  STRING,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (id) NOT ENFORCED
);

CREATE TABLE `project-scrappy-intelic.project_ether.guild_members` (
  guild_id             STRING NOT NULL,
  user_id              STRING NOT NULL,  -- un usuario en un solo gremio a la vez, validar en la app
  role                 STRING DEFAULT 'Member',  -- 'Leader'|'Officer'|'Member'
  weekly_contribution  INT64 DEFAULT 0,
  joined_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (guild_id, user_id) NOT ENFORCED,
  FOREIGN KEY (guild_id) REFERENCES `project-scrappy-intelic.project_ether.guilds`(id) NOT ENFORCED,
  FOREIGN KEY (user_id) REFERENCES `project-scrappy-intelic.project_ether.users`(id) NOT ENFORCED
);
```

## 11. Historial de gacha (bonus — útil para pity system / auditoría de drops)

```sql
CREATE TABLE `project-scrappy-intelic.project_ether.gacha_pull_history` (
  id                    STRING DEFAULT GENERATE_UUID(),
  user_id               STRING NOT NULL,
  banner_id             STRING NOT NULL,
  result_creature_id    STRING,
  result_equipment_id   STRING,
  rarity                STRING NOT NULL,  -- 'Common'|'Rare'|'SSR'|'Mythic'
  pulled_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (id) NOT ENFORCED,
  FOREIGN KEY (user_id) REFERENCES `project-scrappy-intelic.project_ether.users`(id) NOT ENFORCED,
  FOREIGN KEY (banner_id) REFERENCES `project-scrappy-intelic.project_ether.gacha_banners_catalog`(id) NOT ENFORCED,
  FOREIGN KEY (result_creature_id) REFERENCES `project-scrappy-intelic.project_ether.creatures_catalog`(id) NOT ENFORCED,
  FOREIGN KEY (result_equipment_id) REFERENCES `project-scrappy-intelic.project_ether.equipment_catalog`(id) NOT ENFORCED
)
PARTITION BY DATE(pulled_at)
CLUSTER BY user_id;
```

## 12. Cómo aplicarlo

**Opción A — Consola web:** BigQuery Studio → abrí un editor de queries nuevo → pegá todo el bloque SQL (de la sección 1 en adelante) → Run. La consola ejecuta cada `CREATE TABLE` como un statement dentro del mismo script.

**Opción B — `bq` CLI:**

```bash
gcloud config set project project-scrappy-intelic

# Guardá todos los CREATE de este archivo en un .sql y corré:
bq query --use_legacy_sql=false < docs/schema.sql
```

La cuenta de servicio (`project-scrappy-intelic-a7055d2d24a2.json`) necesita el rol `BigQuery Data Editor`
(o `BigQuery Admin` si también va a crear el dataset) sobre el proyecto. En Vercel se carga en base64
vía `GCP_SERVICE_ACCOUNT_KEY_BASE64` (variable **Sensitive**), no como archivo — ver `.env.example`
y la sección de variables de entorno para desplegar.

## 13. Seed: catálogo de criaturas (desde `lib/gameData.ts`)

Las 13 criaturas de `STARTER_CREATURES`, con sus 4 skills cada una, tal cual están hoy en el código.
Corré los tres bloques en orden (criaturas → skills → relación skill↔criatura). Los parámetros de balance
(`base_hp`, `power`, `unlock_level`, etc.) los podés retocar después con `UPDATE`, esto es solo para tener
la data real cargada.

```sql
INSERT INTO `project-scrappy-intelic.project_ether.creatures_catalog`
  (id, name, element, rarity, evolution_stage, sprite_key, sprite_folder, base_hp, base_atk, base_def, base_spd)
VALUES
  ('cr-emberling', 'Emberling', 'Fire', 'Rare', 1, 'emberling', NULL, 620, 148, 76, 104),
  ('cr-tidalfin', 'Tidalfin', 'Water', 'SSR', 2, 'tidalfin', NULL, 780, 132, 94, 96),
  ('cr-gale-sprite', 'Gale Sprite', 'Nature', 'Common', 1, 'gale-sprite', NULL, 480, 110, 62, 132),
  ('cr-voltling', 'Voltling', 'Electric', 'Rare', 1, 'voltling', '/assets/creatures/voltling/idle', 540, 138, 68, 140),
  ('cr-firebit', 'Firebit', 'Fire', 'Rare', 1, 'firebit', '/assets/creatures/firebit/idle', 560, 144, 70, 118),
  ('cr-dragoon', 'Dragoon', 'Nature', 'SSR', 1, 'dragoon', '/assets/creatures/dragoon/idle', 610, 142, 88, 108),
  ('cr-crimson-guardian', 'CrimsonGuardian', 'Fire', 'Mythic', 3, 'crimsonguardian', '/assets/creatures/crimsonguardian/idle', 980, 205, 138, 92),
  ('cr-silver-dragon', 'SilverDragon', 'Light', 'Mythic', 3, 'silverdragon', '/assets/creatures/silverdragon/idle', 1040, 198, 128, 108),
  ('cr-venomshade', 'Venomshade', 'Dark', 'Rare', 1, 'bluelf', '/assets/creatures/bluelf/idle', 560, 150, 64, 128),
  ('cr-tidewarden', 'Tidewarden', 'Water', 'Rare', 1, 'orca', '/assets/creatures/orca/idle', 600, 126, 82, 110),
  ('cr-emberfiend', 'Emberfiend', 'Dark', 'SSR', 2, 'crimsonwarrior', '/assets/creatures/crimsonwarrior/idle', 680, 168, 98, 100),
  ('cr-thundracoil', 'Thundracoil', 'Electric', 'SSR', 2, 'easterndragon', '/assets/creatures/easterndragon/idle', 640, 158, 86, 132),
  ('cr-starweaver', 'Starweaver', 'Light', 'SSR', 2, 'magicelf', '/assets/creatures/magicelf/idle', 620, 140, 88, 118);

INSERT INTO `project-scrappy-intelic.project_ether.skills_catalog`
  (id, name, description, type, power, cooldown, unlock_level)
VALUES
  ('sk-em-1', 'Cinder Claw', 'A blazing slash dealing fire damage to one enemy.', 'Attack', 140, 0, 1),
  ('sk-em-2', 'Flare Guard', 'Raises own DEF for 2 turns.', 'Defense', 0, 3, 5),
  ('sk-em-3', 'Ash Cyclone', 'Hits all enemies with a spinning ember burst.', 'Attack', 95, 4, 10),
  ('sk-em-4', 'Rekindle', 'Passively regenerates HP each turn.', 'Passive', 0, 0, 15),

  ('sk-ti-1', 'Riptide Slash', 'A pressurized water strike on one enemy.', 'Attack', 132, 0, 1),
  ('sk-ti-2', 'Healing Tide', 'Restores HP to the lowest-HP ally.', 'Support', 110, 3, 8),
  ('sk-ti-3', 'Whirlpool', 'Pulls all enemies in, dealing water damage.', 'Attack', 88, 4, 12),
  ('sk-ti-4', 'Deep Focus', 'Passively boosts SPD when HP is above 50%.', 'Passive', 0, 0, 18),

  ('sk-ga-1', 'Vine Whip', 'A quick nature strike on one enemy.', 'Attack', 105, 0, 1),
  ('sk-ga-2', 'Thorn Veil', 'Reduces incoming damage for 2 turns.', 'Defense', 0, 3, 5),
  ('sk-ga-3', 'Bloom Burst', 'Nature damage to all enemies with a chance to slow.', 'Attack', 80, 4, 10),
  ('sk-ga-4', 'Photosynthesis', 'Passively restores small HP each turn in daylight.', 'Passive', 0, 0, 12),

  ('sk-vo-1', 'Spark Bite', 'A quick electric nip on one enemy.', 'Attack', 120, 0, 1),
  ('sk-vo-2', 'Static Charge', 'Raises own SPD for 2 turns.', 'Defense', 0, 3, 5),
  ('sk-vo-3', 'Thunder Dash', 'Electric damage to all enemies with a chance to stun.', 'Attack', 92, 4, 10),
  ('sk-vo-4', "Capacitor Coils", "Passively charges up, boosting the next skill's power.", 'Passive', 0, 0, 14),

  ('sk-fb-1', 'Ember Nip', 'A quick fiery bite on one enemy.', 'Attack', 128, 0, 1),
  ('sk-fb-2', 'Sun Cloak', 'Raises own DEF for 2 turns.', 'Defense', 0, 3, 5),
  ('sk-fb-3', 'Wildfire Romp', 'Fire damage to all enemies with a chance to burn.', 'Attack', 90, 4, 10),
  ('sk-fb-4', 'Kindle Spirit', 'Passively regenerates a small amount of HP each turn.', 'Passive', 0, 0, 13),

  ('sk-dr-1', 'Tail Lash', 'A sweeping tail strike on one enemy.', 'Attack', 134, 0, 1),
  ('sk-dr-2', 'Scale Harden', 'Raises own DEF for 2 turns.', 'Defense', 0, 3, 5),
  ('sk-dr-3', 'Verdant Roar', 'Nature damage to all enemies with a chance to slow.', 'Attack', 96, 4, 10),
  ('sk-dr-4', 'Regenerative Hide', 'Passively restores HP each turn based on max HP.', 'Passive', 0, 0, 16),

  ('sk-cg-1', 'Blazing Judgment', 'A sword strike wreathed in crimson flame on one enemy.', 'Attack', 172, 0, 1),
  ('sk-cg-2', 'Aegis of Embers', 'Raises own DEF sharply for 2 turns with the ceremonial shield.', 'Defense', 0, 3, 5),
  ('sk-cg-3', 'Crimson Cataclysm', 'An overwhelming flame judgment on all enemies.', 'Attack', 138, 5, 15),
  ('sk-cg-4', "Guardian's Resolve", 'Passively reduces damage taken when HP falls below 30%.', 'Passive', 0, 0, 20),

  ('sk-sd-1', 'Radiant Fang', 'A blessed bite crackling with electric light on one enemy.', 'Attack', 168, 0, 1),
  ('sk-sd-2', 'Sacred Scales', 'Raises own DEF and SPD for 2 turns.', 'Defense', 0, 3, 5),
  ('sk-sd-3', 'Astral Nova', 'A burst of sacred light damages all enemies with a chance to blind.', 'Attack', 132, 5, 15),
  ('sk-sd-4', 'Celestial Ward', 'Passively shields the lowest-HP ally each turn.', 'Passive', 0, 0, 20),

  ('sk-ve-1', 'Toxin Fang', 'A poisoned dagger strike on one enemy.', 'Attack', 136, 0, 1),
  ('sk-ve-2', 'Shadow Veil', 'Raises own evasion for 2 turns.', 'Defense', 0, 3, 5),
  ('sk-ve-3', 'Venom Flurry', 'A flurry of blades hitting all enemies with a chance to poison.', 'Attack', 92, 4, 10),
  ('sk-ve-4', 'Creeping Poison', 'Passively deals damage over time to a poisoned enemy.', 'Passive', 0, 0, 14),

  ('sk-tw-1', 'Tidal Slam', 'A crushing wave-borne strike on one enemy.', 'Attack', 122, 0, 1),
  ('sk-tw-2', 'Ancestral Ward', 'Raises own DEF for 2 turns, blessed by totem spirits.', 'Defense', 0, 3, 5),
  ('sk-tw-3', 'Riptide Chant', 'Water damage to all enemies with a chance to slow.', 'Attack', 86, 4, 10),
  ('sk-tw-4', 'Spirit Current', 'Passively restores a small amount of HP each turn.', 'Passive', 0, 0, 13),

  ('sk-ef-1', 'Magma Cleave', 'A molten greatsword strike on one enemy.', 'Attack', 158, 0, 1),
  ('sk-ef-2', 'Infernal Bulwark', 'Raises own DEF sharply for 2 turns.', 'Defense', 0, 3, 5),
  ('sk-ef-3', 'Ashen Wingstorm', 'A sweep of smoldering wings damaging all enemies.', 'Attack', 112, 4, 11),
  ('sk-ef-4', 'Undying Wrath', 'Passively raises ATK when HP falls below 40%.', 'Passive', 0, 0, 16),

  ('sk-th-1', 'Storm Fang', 'A lightning-wreathed bite on one enemy.', 'Attack', 150, 0, 1),
  ('sk-th-2', 'Static Scales', 'Raises own SPD for 2 turns.', 'Defense', 0, 3, 5),
  ('sk-th-3', 'Tempest Roar', 'A crashing storm damaging all enemies with a chance to stun.', 'Attack', 108, 4, 12),
  ('sk-th-4', "Galvanic Core", "Passively charges up, boosting the next skill's power.", 'Passive', 0, 0, 17),

  ('sk-sw-1', 'Starlight Lance', 'A bolt of celestial energy on one enemy.', 'Attack', 132, 0, 1),
  ('sk-sw-2', 'Astral Shield', 'Shields the lowest-HP ally for 2 turns.', 'Support', 0, 3, 5),
  ('sk-sw-3', 'Nova Cascade', 'A burst of starlight damaging all enemies.', 'Attack', 96, 4, 11),
  ('sk-sw-4', 'Guiding Light', 'Passively restores HP to the lowest-HP ally each turn.', 'Passive', 0, 0, 15);

INSERT INTO `project-scrappy-intelic.project_ether.creature_skills`
  (creature_id, skill_id, slot)
VALUES
  ('cr-emberling', 'sk-em-1', 1), ('cr-emberling', 'sk-em-2', 2), ('cr-emberling', 'sk-em-3', 3), ('cr-emberling', 'sk-em-4', 4),
  ('cr-tidalfin', 'sk-ti-1', 1), ('cr-tidalfin', 'sk-ti-2', 2), ('cr-tidalfin', 'sk-ti-3', 3), ('cr-tidalfin', 'sk-ti-4', 4),
  ('cr-gale-sprite', 'sk-ga-1', 1), ('cr-gale-sprite', 'sk-ga-2', 2), ('cr-gale-sprite', 'sk-ga-3', 3), ('cr-gale-sprite', 'sk-ga-4', 4),
  ('cr-voltling', 'sk-vo-1', 1), ('cr-voltling', 'sk-vo-2', 2), ('cr-voltling', 'sk-vo-3', 3), ('cr-voltling', 'sk-vo-4', 4),
  ('cr-firebit', 'sk-fb-1', 1), ('cr-firebit', 'sk-fb-2', 2), ('cr-firebit', 'sk-fb-3', 3), ('cr-firebit', 'sk-fb-4', 4),
  ('cr-dragoon', 'sk-dr-1', 1), ('cr-dragoon', 'sk-dr-2', 2), ('cr-dragoon', 'sk-dr-3', 3), ('cr-dragoon', 'sk-dr-4', 4),
  ('cr-crimson-guardian', 'sk-cg-1', 1), ('cr-crimson-guardian', 'sk-cg-2', 2), ('cr-crimson-guardian', 'sk-cg-3', 3), ('cr-crimson-guardian', 'sk-cg-4', 4),
  ('cr-silver-dragon', 'sk-sd-1', 1), ('cr-silver-dragon', 'sk-sd-2', 2), ('cr-silver-dragon', 'sk-sd-3', 3), ('cr-silver-dragon', 'sk-sd-4', 4),
  ('cr-venomshade', 'sk-ve-1', 1), ('cr-venomshade', 'sk-ve-2', 2), ('cr-venomshade', 'sk-ve-3', 3), ('cr-venomshade', 'sk-ve-4', 4),
  ('cr-tidewarden', 'sk-tw-1', 1), ('cr-tidewarden', 'sk-tw-2', 2), ('cr-tidewarden', 'sk-tw-3', 3), ('cr-tidewarden', 'sk-tw-4', 4),
  ('cr-emberfiend', 'sk-ef-1', 1), ('cr-emberfiend', 'sk-ef-2', 2), ('cr-emberfiend', 'sk-ef-3', 3), ('cr-emberfiend', 'sk-ef-4', 4),
  ('cr-thundracoil', 'sk-th-1', 1), ('cr-thundracoil', 'sk-th-2', 2), ('cr-thundracoil', 'sk-th-3', 3), ('cr-thundracoil', 'sk-th-4', 4),
  ('cr-starweaver', 'sk-sw-1', 1), ('cr-starweaver', 'sk-sw-2', 2), ('cr-starweaver', 'sk-sw-3', 3), ('cr-starweaver', 'sk-sw-4', 4);
```

> Nota: dos nombres de skill traen apóstrofe (`Capacitor Coils`'s description y `Guardian's Resolve`) — están entre comillas dobles (`"..."`) en vez de simples para no tener que escapar el apóstrofe, sintaxis igualmente válida en BigQuery.

## 14. Notas

- Los `*_catalog` se siembran con un script (`INSERT INTO` en lote, o `bq load` desde un JSON/CSV generado a partir de `lib/gameData.ts`) cada vez que cambia el contenido del juego.
- Todo lo que en Postgres sería `CHECK`/`UNIQUE` quedó documentado como comentario en la columna — en BigQuery esa validación vive en el backend de la app, igual que hoy la hace `lib/store.ts` en el cliente.
- `user_id` es el hilo conductor de todo: con estas tablas alcanza para reconstruir el `GameState` que hoy vive en `localStorage` vía `zustand/persist`, pero del lado servidor.
- Repetimos el punto de la sección 0: si esto va a ser el backend real del juego (no solo analítica), migrá al menos `users`, `user_currencies`, `user_creatures`, `user_equipment` y el progreso de campaña a Cloud SQL o Firestore antes de que el volumen de updates se vuelva un problema en BigQuery.
