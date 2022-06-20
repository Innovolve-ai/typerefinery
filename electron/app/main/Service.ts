import * as path from "path"
import { ChildProcess, spawn, type SpawnOptions } from "child_process"
import { type ServiceManager } from "./ServiceManager"
// import pRetry from "p-retry"
import { Logger } from "./Logger"
import fs, { createWriteStream, WriteStream } from "fs"
// import { dataPath, resourceBinary } from "./Resources"
// import stream, { Readable, Writable } from "node:stream"
// import { nextTick } from "process"
// import { Duplex } from "stream"
// import { Stream } from "winston/lib/winston/transports"
import http, { type RequestOptions } from "node:http"
import net from "net"
import EventEmitter from "eventemitter3"
// import EventEmitter from "events"
// import TypedEmitter from "typed-emitter"
// import { TypedEventEmitter } from "./TypedEventEmitter"
// const { execaSync } = await import("execa")
import kill from "tree-kill"

export interface ServiceConfig {
  servicepath: string
  options: SericeConfigFile
  events: ServiceEvents
}

export interface ServiceEvents {
  sendServiceStatus: (id: string, output: any) => void
  sendServiceLog: (id: string, output: any) => void
}

export type ServiceEvent = {
  readonly status: (id: string, output: any) => void
  readonly log: (id: string, output: any) => void
}

export enum SignalType {
  SIGTERM = "SIGTERM",
  SIGKILL = "SIGKILL",
  SIGINT = "SIGINT",
}

export enum ServiceStatus {
  ERROR = "-1",
  DISABLED = "0",
  STOPPING = "30",
  STOPPED = "60",
  STARTING = "90",
  STARTED = "120",
}

export enum ServiceType {
  LOCAL = "10",
  ONLINE = "20",
}

export enum HealthCheckType {
  HTTP = "http",
  TCP = "tcp",
}

export interface HealthCheck {
  type: HealthCheckType
  url?: string
  path?: string
  interval?: number
  timeout?: number
  retries?: number
  tcpport?: number
  tcphost?: string
  start_period?: number
  expected_status?: number
}

export interface ExecConfig {
  execservice?: string
  executable?: {
    win32?: string
    default?: string
  }
  pythonrequirements?: string
  commandline?: string
  serviceorder?: 0
  depend_on?: string[]
  serviceport?: number
  servicehost?: string
  healthcheck?: HealthCheck
}

export interface ServiceActions {
  start: () => void
  stop: () => void
  restart: () => void
}

export interface SericeConfigFile {
  id: string
  name?: string
  description?: string
  enabled?: boolean
  status?: ServiceStatus
  logoutput?: string
  icon?: string
  servicetype?: ServiceType
  execconfig?: ExecConfig
}

const os = {
  isWindows: process.platform === "win32",
  isMac: process.platform === "darwin",
  isLinux: process.platform === "linux",
  //check if path exists using fs.existsSync
  isPathExist: (path: string) => {
    try {
      return fs.existsSync(path)
    } catch (err) {
      console.error(err)
    }
    return false
  },

  //run a process on os and return when finished
  async runProcess(
    command: string,
    args: string[],
    options: SpawnOptions = {}
  ) {
    return await new Promise<string>((resolve) => {
      // set options
      if (options) {
        if (!options.shell) {
          options.shell = true
        }
        if (!options.stdio) {
          options.stdio = ["ignore", "pipe", "pipe"]
        }
      }
      const child = spawn(command, args, options)
      if (child.stdout) {
        child.stdout.on("data", (data) => {
          resolve(data.toString())
        })
      }
    })
  },

  //run command with call back
  async runCommandWithCallBack(
    command: string,
    args: string[],
    options: SpawnOptions = {},
    callback: (data: string) => void
  ) {
    const result = await os.runProcess(command, args, options)
    if (callback) {
      callback(result)
      return
    }
    return result
  },
}

export class Service extends EventEmitter<ServiceEvent> {
  #process?: ChildProcess
  #id: string
  #servicepath: string
  #servicepidfile: string
  #servicesroot: string
  #options: SericeConfigFile
  #events: ServiceEvents
  #serviceport?: number
  #servicehost?: string
  #serviceManager: ServiceManager
  #stdout: WriteStream
  #stderr: WriteStream
  #logger: Logger
  #healthCheck?: HealthCheck
  #status: ServiceStatus
  #abortController: AbortController
  constructor(
    logsDir: string,
    logger: Logger,
    servicepath: string,
    options: SericeConfigFile,
    events: ServiceEvents,
    serviceManager: ServiceManager
  ) {
    super()
    this.#abortController = new AbortController()
    this.#servicepath = servicepath
    this.#options = options
    this.#events = events
    this.#serviceManager = serviceManager
    this.#id = this.#options.id
    this.#serviceport = this.#options.execconfig?.serviceport || 0
    this.#servicehost = this.#options.execconfig?.servicehost || "localhost"
    this.#healthCheck = this.#options.execconfig?.healthcheck
    this.#status = this.#options.status || ServiceStatus.DISABLED
    // create logger for service
    this.#logger = logger.forService(this.#id)
    // create stderr log file for service executable
    this.#stderr = createWriteStream(
      path.join(logsDir, `${this.#id}-error.log`),
      {
        flags: "a",
        mode: 0o666,
        autoClose: true,
        encoding: "utf8",
        highWaterMark: 100,
      }
    )
    this.#stderr.on("error", (err) => {
      this.#logger.error(err)
    })
    this.#log(`service error log ${this.#stderr.path}`)

    // create stdout log file for service executable
    this.#stdout = createWriteStream(
      path.join(logsDir, `${this.#id}-console.log`),
      {
        flags: "a",
        mode: 0o666,
        autoClose: true,
        encoding: "utf8",
        highWaterMark: 100,
      }
    )
    this.#stdout.on("error", (err) => {
      this.#logger.error(err)
    })
    this.#log(`service console log ${this.#stdout.path}`)

    const config = options.execconfig
    if (config) {
      this.#serviceport = config.serviceport || -1
    }

    this.#servicesroot = path.resolve(path.dirname(servicepath))
    this.#servicepidfile = path.join(
      this.#servicepath,
      path.basename(this.#servicepath) + ".pid"
    )
    // this.executable = this.getServiceExecutable()
    // check if service is already running
    if (os.isPathExist(this.#servicepidfile)) {
      const pid = fs.readFileSync(this.#servicepidfile, "utf8")

      //check if service pid is runnin on linux
      if (process.platform == "win32") {
        os.runCommandWithCallBack(
          'tasklist /fi "PID eq ' + pid + '"',
          [],
          { signal: this.#abortController.signal },
          (data) => {
            if (data.includes("No tasks are running")) {
              // no process running
              this.#removeServicePidFile()
              this.#status = ServiceStatus.STOPPED
            } else {
              // process is running
              this.#status = ServiceStatus.STARTED
              this.#setStatus("running")
              return
            }
          }
        )
      } else {
        os.runCommandWithCallBack(
          "ps -p " + pid + " -o pid=",
          [],
          { signal: this.#abortController.signal },
          (data) => {
            if (data.includes("No such process")) {
              // no process running
              this.#removeServicePidFile()
              this.#status = ServiceStatus.STOPPED
            } else {
              // process is running
              this.#status = ServiceStatus.STARTED
              this.#setStatus("running")
              return
            }
          }
        )
      }
    } else {
      this.#status = ServiceStatus.STOPPED
    }
  }

  // get log(): Readable {
  //   return this.#consolelog
  // }

  get id(): string {
    return this.#id
  }

  get status(): string {
    return this.#status
  }

  get options(): SericeConfigFile {
    return this.#options
  }

  get isRunning() {
    if (this.#process) {
      return !this.#process.killed
    } else {
      return false
    }
  }

  get port() {
    return this.#serviceport
  }

  public toString = (): string => {
    return JSON.stringify(
      Object.assign(
        {},
        {
          id: this.#id,
          servicepath: this.#servicepath,
          servicepidfile: this.#servicepidfile,
        }
      ),
      null,
      "  "
    )
  }

  #register(process: ChildProcess) {
    this.#process = process
    if (process.pid) {
      this.#createServicePidFile(this.#servicepidfile, process.pid)
    }
    process.once("exit", () => {
      this.#removeServicePidFile()
      this.#status = ServiceStatus.STOPPED
      this.#log(`stopped ${this.#id} with pid ${this.#process?.pid}`)
      this.#process = void 0
    })
    // run health check if defined
    if (this.#healthCheck) {
      this.#startHealthCheck(this.#healthCheck.retries || 1)
    }
  }

  // get service executable from options by platform
  getServiceExecutable(): string {
    let serviceExecutable: any = ""
    if (this.#options && this.#options.execconfig) {
      // if service is being executed by another service
      if (this.#options.execconfig.execservice) {
        // find service executable
        const execservice = this.#options.execconfig.execservice
        const serviceExecutableService =
          this.#serviceManager.getService(execservice)
        // get full path to executable service
        const serviceExecutable = path.resolve(
          serviceExecutableService.#servicepath,
          serviceExecutableService.getServiceExecutable()
        )
        return serviceExecutable
      } else if (this.#options.execconfig.executable) {
        // if service is being executed by a file
        const platform =
          process.platform == "win32" ? process.platform : "default"
        serviceExecutable = this.#options.execconfig.executable[platform]
        if (serviceExecutable == null) {
          serviceExecutable = this.#options.execconfig.executable.default
        }
        return serviceExecutable
      }
      if (serviceExecutable == null) {
        this.#log("could not determine service executable")
        // this.disable()
      }
    } else {
      this.#log("service is missing execconfig.")
    }
    return serviceExecutable
  }

  // set enable flag in options to false
  disable() {
    this.#options.enabled = false
  }

  // set enable flag in options to true
  enable() {
    this.#options.enabled = true
  }

  // interval: 10s
  // retries: 60
  // start_period: 60s
  // start helth check and repeat until retries is 0
  #startHealthCheck(retries: number) {
    if (this.#healthCheck && this.#status != ServiceStatus.STARTED) {
      if (retries > 0) {
        const firtRun = retries == (this.#healthCheck?.retries || 1)
        let timeoutInterval = this.#healthCheck?.interval || 1000
        let nextRetry = retries--
        //wait for start period
        if (firtRun) {
          timeoutInterval = this.#healthCheck.start_period || 1000
          nextRetry = this.#healthCheck?.retries || 10
        }
        this.#runHealthCheck()
        setTimeout(() => {
          this.#startHealthCheck(nextRetry)
        }, timeoutInterval)
      }
    }
  }

  // run health check
  #runHealthCheck(): void {
    if (this.#healthCheck) {
      if (this.#healthCheck.type == HealthCheckType.HTTP) {
        this.#runHealthCheckHttp()
      } else if (this.#healthCheck.type == HealthCheckType.TCP) {
        this.#runHealthCheckTcp()
      }
    }
  }

  // run health check http
  #runHealthCheckHttp(): void {
    if (this.#healthCheck && this.#healthCheck.url) {
      const urlFixed = this.#healthCheck.url
        .replace("${SERVICE_PATH}", this.#servicepath)
        .replace("${SERVICE_PORT}", this.#serviceport + "")
      const url: URL = new URL(urlFixed)
      const hostname = url.hostname
      const port = url.port
      const path = url.pathname

      const options: RequestOptions = {
        hostname: hostname,
        port: port,
        path: path,
        timeout: this.#healthCheck?.timeout || 1000,
      }
      try {
        const req = http.get(options, (res) => {
          if (res.statusCode == 200) {
            this.#log("health check success")
            this.#status = ServiceStatus.STARTED
          } else {
            this.#log("health check failed")
            this.#status = ServiceStatus.STOPPED
          }
        })
        req.on("error", (e) => {
          this.#log("health check failed")
          this.#status = ServiceStatus.STOPPED
        })
      } catch (error) {
        this.#log("health check failed")
        this.#status = ServiceStatus.STOPPED
      }
    }
  }

  // run health check tcp
  #runHealthCheckTcp(): void {
    if (
      this.#healthCheck &&
      this.#healthCheck.tcpport &&
      this.#healthCheck.tcphost
    ) {
      const socket = net.createConnection(
        this.#healthCheck.tcpport,
        this.#healthCheck.tcphost,
        () => {
          this.#log("health check success")
          this.#status = ServiceStatus.STARTED
          socket.end()
        }
      )
      socket.on("error", () => {
        this.#log("health check failed")
        this.#status = ServiceStatus.STOPPED
      })
    }
  }

  // get an open port
  async #getOpenPort(): Promise<number> {
    const port = await this.#serviceManager.getOpenPort(
      this.#serviceport,
      this.#servicehost
    )
    return parseInt(port + "")
  }

  // start service and store its process id in a file based on os type
  async start() {
    if (this.#status == ServiceStatus.STARTED) {
      this.#log(
        `service ${this.#id} already started with pid ${this.#process?.pid}`
      )
      return
    }

    this.#log(`starting ${this.#id}`)
    this.#setStatus(ServiceStatus.STARTING)

    const serviceExecutable = this.getServiceExecutable()

    this.#serviceport = await this.#getOpenPort()

    if (serviceExecutable) {
      let commandline = new Array<string>()
      if (
        this.#options &&
        this.#options.execconfig &&
        this.#options.execconfig.commandline
      ) {
        commandline =
          this.#options.execconfig.commandline
            .replace("${SERVICE_PATH}", this.#servicepath)
            .replace("${SERVICE_PORT}", this.#serviceport.toString())
            .split(" ") || []
      }

      const options: SpawnOptions = {
        cwd: this.#servicesroot,
        signal: this.#abortController.signal,
        windowsVerbatimArguments: true,
        env: { PYTHONPATH: this.#servicepath },
        shell: true,
        // send data to logs but it will be delayed as its buffered in 64k blocks :(
        stdio: ["ignore", this.#stdout, this.#stderr],
      }

      this.#log([
        "spawn",
        {
          serviceExecutable: serviceExecutable,
          commandline: commandline,
          options: options,
        },
      ])

      const process = spawn(serviceExecutable, commandline, options)
      // monitor console
      if (process.stdout) {
        process.stdout.setEncoding("utf8")
        process.stdout.on("data", (data) => {
          this.#log(data)
        })
      }
      // monitor error log
      if (process.stderr) {
        process.stderr.setEncoding("utf8")
        process.stderr.on("data", (data) => {
          this.#log(data)
        })
      }

      this.#register(process)
    } else {
      this.#log("unsuported service type")
      return
    }
  }
  //cretae pid file for service
  #createServicePidFile(servicepidfile: string, pid: number) {
    if (this.#process && pid && servicepidfile) {
      fs.writeFileSync(servicepidfile, pid.toString())
    } else {
      this.#log("child process is null")
    }
  }

  // remiove service pid file
  #removeServicePidFile() {
    if (fs.existsSync(this.#servicepidfile)) {
      fs.unlinkSync(this.#servicepidfile)
    }
  }

  stop() {
    if (this.#process) {
      const pid: number = this.#process?.pid ? this.#process.pid : 0
      if (pid > 0) {
        this.#log(`stopping ${this.#id} with pid ${pid}`)
        this.#setStatus(ServiceStatus.STOPPING)
        if (this.#process && this.#process.pid) {
          this.#log(`killing ${pid}`)
          kill(pid, SignalType.SIGINT, (err) => {
            this.#log(`kill ${pid} error ${err}`)
          })
        }
      }
    }
  }

  #log(message: any) {
    this.#logger.log(message)
    this.emit("log", this.#id, message)
  }

  #setStatus(output: string) {
    if (this.#events.sendServiceStatus) {
      this.#events.sendServiceStatus(this.#id, output)
      this.emit("status", this.#id, output)
    }
  }
}