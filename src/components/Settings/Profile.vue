<template>
  <div class="user_info-wrapper">
    <div class="avatar-wrapper">
      <i class="pi pi-user"></i>
    </div>
    <div class="user_info">
      <div class="user_info-name">{{ username }}</div>
      <div class="user_info-email">{{ email }}</div>
    </div>
  </div>

  <div ref="username" class="field">
    <label for="username">
      {{ $t("components.setting.profile.username") }}</label
    >
    <InputText id="username" :value="username" @input="setUsername" />
  </div>
  <div ref="alias" class="field">
    <label for="alias">{{ $t("components.setting.profile.alias") }}</label>
    <InputText id="alias" :value="alias" @input="setAlias" />
  </div>
  <div ref="email" class="field">
    <label for="email">{{ $t("components.setting.profile.email") }}</label>
    <InputText id="email" :value="email" @input="setEmail" />
  </div>
</template>

<script>
  import InputText from "primevue/inputtext"
  import { getModule } from "vuex-module-decorators"
  import Auth from "@/store/Modules/Auth"
  const authModule = getModule(Auth)

  export default {
    name: "Profile",
    components: { InputText },
    props: { field: { type: String, default: "" } },

    computed: {
      username() {
        return authModule.data.username
      },
      alias() {
        return authModule.data.alias
      },
      email() {
        return authModule.data.email
      },
    },
    mounted() {
      if (this.field) {
        const el = this.$refs[this.field]
        el.scrollIntoView()
      }
    },
    methods: {
      setUsername(e) {
        return authModule.setUsername(e.target.value)
      },
      setAlias(e) {
        return authModule.setAliasname(e.target.value)
      },
      setEmail(e) {
        return authModule.setEmail(e.target.value)
      },
    },
  }
</script>

<style>
  .p-float-label {
    margin-bottom: 10px;
  }

  input {
    width: 80%;
  }
</style>
