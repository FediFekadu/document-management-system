<?php
class Validator {
    private array $errors = [];

    public function required(string $field, $value): self {
        if ($value === null || trim((string)$value) === '') {
            $this->errors[$field] = "$field is required.";
        }
        return $this;
    }

    public function email(string $field, $value): self {
        if ($value && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
            $this->errors[$field] = "$field must be a valid email address.";
        }
        return $this;
    }

    public function minLength(string $field, $value, int $min): self {
        if ($value !== null && mb_strlen((string)$value) < $min) {
            $this->errors[$field] = "$field must be at least $min characters.";
        }
        return $this;
    }

    public function maxLength(string $field, $value, int $max): self {
        if ($value !== null && mb_strlen((string)$value) > $max) {
            $this->errors[$field] = "$field must not exceed $max characters.";
        }
        return $this;
    }

    public function inList(string $field, $value, array $list): self {
        if ($value !== null && !in_array($value, $list, true)) {
            $this->errors[$field] = "$field must be one of: " . implode(', ', $list) . '.';
        }
        return $this;
    }

    public function fails(): bool {
        return !empty($this->errors);
    }

    public function errors(): array {
        return $this->errors;
    }
}
