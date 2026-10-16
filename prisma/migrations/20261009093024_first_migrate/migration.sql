-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `rememberToken` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `faculties` (
    `id_faculty` INTEGER NOT NULL AUTO_INCREMENT,
    `name_faculty` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `faculties_name_faculty_key`(`name_faculty`),
    PRIMARY KEY (`id_faculty`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `departments` (
    `id_department` INTEGER NOT NULL AUTO_INCREMENT,
    `name_department` VARCHAR(191) NOT NULL,
    `degree_level` VARCHAR(191) NOT NULL,
    `id_faculty` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `departments_name_department_key`(`name_department`),
    PRIMARY KEY (`id_department`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id_category` INTEGER NOT NULL AUTO_INCREMENT,
    `name_category` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `categories_name_category_key`(`name_category`),
    PRIMARY KEY (`id_category`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `locations` (
    `id_location` INTEGER NOT NULL AUTO_INCREMENT,
    `student_name` VARCHAR(191) NOT NULL,
    `nim` VARCHAR(10) NOT NULL,
    `name_location` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `contact` VARCHAR(15) NOT NULL,
    `longitude` DECIMAL(11, 8) NOT NULL,
    `latitude` DECIMAL(10, 8) NOT NULL,
    `approved_at` TIMESTAMP(0) NULL,
    `id_category` INTEGER NOT NULL,
    `id_department` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `locations_nim_key`(`nim`),
    UNIQUE INDEX `locations_name_location_nim_key`(`name_location`, `nim`),
    PRIMARY KEY (`id_location`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `images` (
    `id_image` INTEGER NOT NULL AUTO_INCREMENT,
    `image_path` TEXT NOT NULL,
    `alt_text` TEXT NULL,
    `id_location` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,
    `deletedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id_image`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profile_web` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `app_name` VARCHAR(191) NOT NULL,
    `logo_path` TEXT NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `departments` ADD CONSTRAINT `departments_id_faculty_fkey` FOREIGN KEY (`id_faculty`) REFERENCES `faculties`(`id_faculty`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `locations` ADD CONSTRAINT `locations_id_category_fkey` FOREIGN KEY (`id_category`) REFERENCES `categories`(`id_category`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `locations` ADD CONSTRAINT `locations_id_department_fkey` FOREIGN KEY (`id_department`) REFERENCES `departments`(`id_department`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `images` ADD CONSTRAINT `images_id_location_fkey` FOREIGN KEY (`id_location`) REFERENCES `locations`(`id_location`) ON DELETE CASCADE ON UPDATE CASCADE;
