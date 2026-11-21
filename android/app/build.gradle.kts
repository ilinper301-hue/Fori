plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// La clave de firma llega desde GitHub Actions (secretos del repositorio); sin ella solo se puede compilar en modo depuración.
val claveArchivo: String? = System.getenv("FORI_KEYSTORE_FILE")
val clavePass: String? = System.getenv("FORI_KEYSTORE_PASSWORD")
// Cada compilación de Actions sube el número de versión, para que Android acepte la APK nueva encima de la anterior.
val numVersion = (System.getenv("FORI_VERSION_CODE") ?: "1").toInt()

android {
    namespace = "es.fori.pizarra"
    compileSdk = 35

    defaultConfig {
        applicationId = "es.fori.pizarra"
        minSdk = 24
        targetSdk = 35
        versionCode = numVersion
        versionName = "1.0.$numVersion"
    }

    signingConfigs {
        if (claveArchivo != null) {
            create("fori") {
                storeFile = file(claveArchivo)
                storePassword = clavePass
                keyAlias = "fori"
                keyPassword = clavePass
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            if (claveArchivo != null) signingConfig = signingConfigs.getByName("fori")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core:1.13.1") // FileProvider, para las fotos de la cámara
}
