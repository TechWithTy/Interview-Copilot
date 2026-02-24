<template>
  <div id="app">
    <el-menu :default-active="$router.currentRoute.path" mode="horizontal" :router="true" style="display: flex; align-items: center;">
      <el-menu-item index="/">Interview Copilot</el-menu-item>
      <el-menu-item index="/setting">Setting</el-menu-item>
      <div style="margin-left: auto; margin-right: 20px;">
        <el-switch
          v-model="isDark"
          active-text="Dark Mode"
          inactive-text="Light Mode"
          @change="toggleDarkMode">
        </el-switch>
      </div>
    </el-menu>
    <router-view class="router_view"/>
  </div>
</template>

<style>
body {
  transition: background-color 0.3s, color 0.3s;
  margin: 0;
  padding: 0;
}
body.dark-mode {
  background-color: #121212;
  color: #e0e0e0;
}
body.dark-mode .el-card,
body.dark-mode .box,
body.dark-mode .el-menu {
  background-color: #1e1e1e !important;
  color: #e0e0e0 !important;
  border-color: #333 !important;
}
body.dark-mode .el-menu-item {
  color: #e0e0e0 !important;
}
body.dark-mode .el-menu-item.is-active {
  color: #409EFF !important;
}
body.dark-mode .el-input__inner,
body.dark-mode .el-textarea__inner {
  background-color: #2c2c2c !important;
  color: #e0e0e0 !important;
  border-color: #444 !important;
}
body.dark-mode .desc_text {
  color: #a0a0a0 !important;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
<script>
import {mapGetters} from 'vuex';

export default {
  name: 'App',
  props: {},
  computed: {},
  beforeMount() {
  },
  mounted() {
    this.isDark = localStorage.getItem('isDark') === 'true';
    if(this.isDark) {
      document.body.classList.add('dark-mode');
    }
  },
  data() {
    return {
      activeIndex: "/",
      isDark: false,
    }
  },
  methods: {
    toggleDarkMode(val) {
      localStorage.setItem('isDark', val.toString());
      if(val) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
    }
  }
}

</script>
<style>
.router_view {
  margin-top: 10px;
}
</style>