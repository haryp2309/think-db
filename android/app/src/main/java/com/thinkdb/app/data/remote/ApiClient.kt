package com.thinkdb.app.data.remote

import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {
    var baseUrl: String = "http://10.0.2.2:8000/"
        private set

    private val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        isLenient = true
        encodeDefaults = true
    }

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .addInterceptor(HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        })
        .build()

    private var currentRetrofit: Retrofit? = null
    private var currentService: ApiService? = null

    fun getService(customBaseUrl: String? = null): ApiService {
        val targetUrl = customBaseUrl?.let {
            if (it.endsWith("/")) it else "$it/"
        } ?: baseUrl

        if (currentService == null || baseUrl != targetUrl) {
            baseUrl = targetUrl
            val contentType = "application/json".toMediaType()
            currentRetrofit = Retrofit.Builder()
                .baseUrl(baseUrl)
                .client(okHttpClient)
                .addConverterFactory(json.asConverterFactory(contentType))
                .build()
            currentService = currentRetrofit!!.create(ApiService::class.java)
        }
        return currentService!!
    }
}
