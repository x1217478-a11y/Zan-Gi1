package com.zangi.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zangi.app.data.model.AiAssistantMessage
import com.zangi.app.data.model.AiLanguage
import com.zangi.app.data.model.AiServiceStatus
import com.zangi.app.data.model.AiTaskType
import com.zangi.app.data.repository.AiRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class AiAssistantUiState(
    val isGenerating: Boolean = false,
    val currentLanguage: AiLanguage = AiLanguage.BENGALI,
    val activeTask: AiTaskType = AiTaskType.GENERAL_CHAT,
    val errorMessage: String? = null,
    val inputPrompt: String = ""
)

class AiAssistantViewModel(
    private val repository: AiRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(AiAssistantUiState())
    val uiState: StateFlow<AiAssistantUiState> = _uiState.asStateFlow()

    val messages: StateFlow<List<AiAssistantMessage>> = repository.getMessagesFlow()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val serviceStatus: StateFlow<AiServiceStatus> = repository.getServiceStatus()
        .stateIn(
            viewModelScope,
            SharingStarted.WhileSubscribed(5000),
            AiServiceStatus(true, "Gemini Proxy", "gemini-3.8-flash", "Ready")
        )

    fun setLanguage(language: AiLanguage) {
        _uiState.value = _uiState.value.copy(currentLanguage = language)
    }

    fun setTask(task: AiTaskType) {
        _uiState.value = _uiState.value.copy(activeTask = task)
    }

    fun onInputChanged(input: String) {
        _uiState.value = _uiState.value.copy(inputPrompt = input)
    }

    fun sendPrompt() {
        val prompt = _uiState.value.inputPrompt.trim()
        if (prompt.isEmpty() || _uiState.value.isGenerating) return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isGenerating = true, inputPrompt = "", errorMessage = null)
            val result = repository.sendMessage(
                prompt = prompt,
                taskType = _uiState.value.activeTask,
                language = _uiState.value.currentLanguage
            )
            _uiState.value = _uiState.value.copy(
                isGenerating = false,
                errorMessage = result.exceptionOrNull()?.message
            )
        }
    }

    fun clearHistory() {
        viewModelScope.launch {
            repository.clearHistory()
        }
    }
}
