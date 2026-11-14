CREATE TABLE `attendance` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`work_id` integer NOT NULL,
	`employee_id` integer NOT NULL,
	`date` text NOT NULL,
	`entry_time` text,
	`exit_time` text,
	`break_hours` real DEFAULT 0 NOT NULL,
	`hours_worked` real DEFAULT 0 NOT NULL,
	`presence` text DEFAULT 'presente' NOT NULL,
	`note` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_unique` ON `attendance` (`work_id`,`employee_id`,`date`);--> statement-breakpoint
CREATE TABLE `employee_integrations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`employee_id` integer NOT NULL,
	`client` text NOT NULL,
	`unit` text NOT NULL,
	`integration_date` text NOT NULL,
	`valid_until` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `employee_nrs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`employee_id` integer NOT NULL,
	`name` text NOT NULL,
	`valid_until` text
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`cpf` text NOT NULL,
	`phone` text,
	`city` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`aso_valid_until` text,
	`contract_type` text,
	`photo` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `employees_cpf_unique` ON `employees` (`cpf`);--> statement-breakpoint
CREATE TABLE `evaluations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`work_id` integer NOT NULL,
	`employee_id` integer NOT NULL,
	`productivity` integer NOT NULL,
	`assiduity` integer NOT NULL,
	`relationship` integer NOT NULL,
	`average` real NOT NULL,
	`comment` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `evaluation_unique` ON `evaluations` (`work_id`,`employee_id`);--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`work_id` integer NOT NULL,
	`date` text NOT NULL,
	`category` text NOT NULL,
	`description` text,
	`employee_id` integer,
	`quantity` real DEFAULT 1 NOT NULL,
	`unit_cost` real DEFAULT 0 NOT NULL,
	`total` real DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rdo_crew` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`rdo_id` integer NOT NULL,
	`employee_id` integer,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`productive_hours` real DEFAULT 0 NOT NULL,
	`unproductive_hours` real DEFAULT 0 NOT NULL,
	`reason` text
);
--> statement-breakpoint
CREATE TABLE `rdo_photos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`rdo_id` integer NOT NULL,
	`data_url` text NOT NULL,
	`caption` text
);
--> statement-breakpoint
CREATE TABLE `rdos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`work_id` integer NOT NULL,
	`date` text NOT NULL,
	`weather` text,
	`activities` text NOT NULL,
	`incidents` text,
	`notes` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rdo_unique` ON `rdos` (`work_id`,`date`);--> statement-breakpoint
CREATE TABLE `work_checklist` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`work_id` integer NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`note` text,
	`done` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `work_employees` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`work_id` integer NOT NULL,
	`employee_id` integer NOT NULL,
	`crew_type` text DEFAULT 'titular' NOT NULL,
	`salary` real DEFAULT 0 NOT NULL,
	`adicional` text DEFAULT 'nenhum' NOT NULL,
	`daily_allowance` real DEFAULT 0 NOT NULL,
	`daily_fuel` real DEFAULT 0 NOT NULL,
	`daily_transport` real DEFAULT 0 NOT NULL,
	`voucher` real DEFAULT 0 NOT NULL,
	`period_start` text,
	`period_end` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `work_employee_unique` ON `work_employees` (`work_id`,`employee_id`);--> statement-breakpoint
CREATE TABLE `work_tools` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`work_id` integer NOT NULL,
	`name` text NOT NULL,
	`unit` text DEFAULT 'UNIDADE' NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`attended` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `works` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`city` text NOT NULL,
	`client` text,
	`responsible` text,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`contract_value` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'planejada' NOT NULL,
	`functions_count` integer DEFAULT 0 NOT NULL,
	`pricing_model` text DEFAULT 'pacote' NOT NULL,
	`has_sede_fabrication` integer DEFAULT false NOT NULL,
	`required_crew` integer DEFAULT 0 NOT NULL,
	`crew_plan` text,
	`cover_image` text,
	`created_at` integer NOT NULL
);
